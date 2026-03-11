'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  X,
  Send,
  Paperclip,
  File,
  Download,
  Loader2,
  CheckCheck,
  Check,
  ArrowLeft,
  DollarSign,
  Home,
  Mail,
  MoreVertical,
  ExternalLink
} from 'lucide-react';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function ChatWindow({ conversation, lender, financingRequest, onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const listingHref = conversation?.property_slug ? `/${conversation.property_slug}` : (conversation?.property_id ? `/${conversation.property_id}` : null);

  // Fetch messages on mount
  useEffect(() => {
    if (conversation?.id && user?.id) {
      setLoading(true);
      fetchMessages();
      markMessagesAsRead();

      // Setup real-time subscription and return cleanup function
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [conversation?.id, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/buyer/chat?action=get_messages&conversation_id=${conversation.id}`,
        {
          headers: {
            'Authorization': `Bearer ${user.id}`
          }
        }
      );
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          action: 'mark_as_read',
          conversationId: conversation.id
        })
      });
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const supabase = getSupabase();
    if (!supabase) return () => {};
    const channel = supabase
      .channel(`conversation-${conversation.id}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          const updated = payload.new;
          if (updated?.id != null && updated.is_read) {
            setMessages((prev) =>
              prev.map((msg) => (String(msg.id) === String(updated.id) ? { ...msg, is_read: true } : msg))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        async (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            const messageExists = prev.some(msg => String(msg.id) === String(newMsg?.id));
            if (messageExists || !newMsg?.id) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();

          if (newMsg?.sender_type === 'lender' || newMsg?.sender_type === 'seller') {
            try {
              await fetch('/api/buyer/chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user.id}`
                },
                body: JSON.stringify({
                  action: 'mark_as_read',
                  conversationId: conversation.id
                })
              });
            } catch (error) {
              console.error('Failed to mark message as read:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() && previewFiles.length === 0) return;

    // If there's a file, send it with the message
    if (previewFiles.length > 0) {
      await handleSendFile();
      return;
    }

    try {
      setSending(true);

      const response = await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          action: 'send_message',
          conversationId: conversation.id,
          messageText: newMessage.trim()
        })
      });

      const data = await response.json();

      if (data.success && data.message) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        setNewMessage('');
        scrollToBottom();
        setTimeout(() => textareaRef.current?.focus(), 0);
      } else {
        const errMsg = data.error || 'Failed to send message. Please try again.';
        alert(errMsg);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    const preview = {
      file,
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9)
    };

    setPreviewFiles([preview]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePreview = () => {
    if (previewFiles[0]) {
      URL.revokeObjectURL(previewFiles[0].url);
    }
    setPreviewFiles([]);
  };

  const handleSendFile = async () => {
    if (previewFiles.length === 0) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', previewFiles[0].file);

      const uploadResponse = await fetch('/api/buyer/upload', {
        method: 'POST',
        body: formData
      });

      const uploadData = await uploadResponse.json();

      if (uploadData.success) {
        const response = await fetch('/api/buyer/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.id}`
          },
          body: JSON.stringify({
            action: 'send_message',
            conversationId: conversation.id,
            messageText: newMessage.trim() || null,
            hasAttachment: true,
            attachmentUrl: uploadData.url,
            attachmentName: uploadData.fileName,
            attachmentType: uploadData.fileType,
            attachmentSize: uploadData.fileSize
          })
        });

        const data = await response.json();

        if (data.success && data.message) {
          setNewMessage('');
          handleRemovePreview();
          scrollToBottom();
          setTimeout(() => textareaRef.current?.focus(), 0);
        }
      } else {
        alert(uploadData.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Group messages by time window (same group = within 5 min of previous message); show time only once per group
  const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;
  const messageGroups = (() => {
    if (!messages.length) return [];
    const groups = [];
    let current = [messages[0]];
    for (let i = 1; i < messages.length; i++) {
      const prev = new Date(messages[i - 1].created_at).getTime();
      const curr = new Date(messages[i].created_at).getTime();
      if (curr - prev <= MESSAGE_GROUP_WINDOW_MS) {
        current.push(messages[i]);
      } else {
        groups.push(current);
        current = [messages[i]];
      }
    }
    groups.push(current);
    return groups;
  })();

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (type) => {
    return type?.startsWith('image/');
  };

  const handleImageLoad = (messageId) => {
    setLoadedImages((prev) => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
  };

  const renderAttachment = (message) => {
    if (!message.has_attachment) return null;

    const isUser = message.sender_type === 'user';
    const imageLoaded = loadedImages.has(message.id);

    if (isImage(message.attachment_type)) {
      return (
        <div className="mt-2 relative">
          {/* Loading placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-slate-200 rounded-xl animate-pulse flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          )}
          <img
            src={message.attachment_url}
            alt={message.attachment_name}
            onLoad={() => handleImageLoad(message.id)}
            onClick={() => setSelectedImage(message.attachment_url)}
            className={`max-w-[280px] rounded-xl cursor-pointer hover:opacity-95 transition-all duration-300 ${
              imageLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
            }`}
          />
        </div>
      );
    }

    return (
      <div className="mt-2">
        <a
          href={message.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors ${
            isUser
              ? 'bg-slate-800 hover:bg-slate-700'
              : 'bg-slate-100 hover:bg-slate-200'
          }`}
        >
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            isUser ? 'bg-white/20' : 'bg-red-50'
          }`}>
            <File className={`w-5 h-5 ${isUser ? 'text-white' : 'text-red-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              isUser ? 'text-white' : 'text-slate-900'
            }`}>
              {message.attachment_name}
            </p>
            <p className={`text-xs ${
              isUser ? 'text-white/70' : 'text-slate-600'
            }`}>
              {formatFileSize(message.attachment_size)}
            </p>
          </div>
          <Download className={`w-4 h-4 ${isUser ? 'text-white/70' : 'text-slate-400'}`} />
        </a>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header: full name, property address, options (View listing) */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            {conversation?.property_thumbnail_url ? (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                <img
                  src={conversation.property_thumbnail_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#002A3A] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {lender?.business_name?.charAt(0)?.toUpperCase() || (financingRequest ? 'L' : 'S')}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-slate-900 text-sm truncate">
                {lender?.business_name || (financingRequest ? 'Lender' : 'Seller')}
              </h2>
              {conversation?.property_address && (
                <p className="text-[11px] text-slate-600 truncate mt-0.5">{conversation.property_address}</p>
              )}
              {financingRequest && !conversation?.property_address && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                    <Home className="w-3 h-3" />
                    {financingRequest.property_type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#b29578]">
                    <DollarSign className="w-3 h-3" />
                    {Number(financingRequest.loan_amount).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {listingHref && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setHeaderMenuOpen((v) => !v)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Options"
              >
                <MoreVertical className="w-5 h-5 text-slate-600" />
              </button>
              {headerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setHeaderMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                    <Link
                      href={listingHref}
                      onClick={() => setHeaderMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View listing
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-200">
                <Send className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">No messages yet</p>
              <p className="text-xs text-slate-600 mt-1">Start the conversation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messageGroups.map((group) => (
              <div key={group[0].id} className="space-y-2">
                {group.map((message) => {
                  const isUser = message.sender_type === 'user';
                  const isLastInGroup = message.id === group[group.length - 1].id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="flex flex-col max-w-[70%]">
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            isUser
                              ? 'bg-[#002A3A] text-white rounded-br-sm'
                              : 'bg-white text-slate-900 rounded-bl-sm shadow-sm border border-slate-200'
                          }`}
                        >
                          {message.message_text && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {message.message_text}
                            </p>
                          )}
                          {renderAttachment(message)}
                        </div>
                        {(message.is_from_email || isLastInGroup) && (
                          <div className={`flex items-center gap-1 mt-1.5 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            {message.is_from_email && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                <Mail className="w-3 h-3" />
                                <span>Email</span>
                              </div>
                            )}
                            {isLastInGroup && (
                              <>
                                <span className="text-[11px] text-slate-400">
                                  {formatTime(message.created_at)}
                                </span>
                                {isUser && (
                                  message.is_read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-slate-400" />
                                  )
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </div>

      {/* File Preview */}
      {previewFiles.length > 0 && (
        <div className="flex-shrink-0 px-5 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
            {isImage(previewFiles[0].file.type) ? (
              <img
                src={previewFiles[0].url}
                alt="Preview"
                className="w-12 h-12 object-cover rounded-lg"
              />
            ) : (
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <File className="w-6 h-6 text-red-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {previewFiles[0].file.name}
              </p>
              <p className="text-xs text-slate-600">
                {formatFileSize(previewFiles[0].file.size)}
              </p>
            </div>
            <button
              onClick={handleRemovePreview}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Paperclip className="w-5 h-5 text-slate-600" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />

          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type a message..."
            disabled={uploading || sending}
            rows={1}
            className="flex-1 resize-none px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 disabled:opacity-50 disabled:cursor-not-allowed max-h-32 transition-all"
          />

          <button
            type="submit"
            disabled={(!newMessage.trim() && previewFiles.length === 0) || uploading || sending}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 rounded-xl transition-colors disabled:cursor-not-allowed flex-shrink-0"
          >
            {uploading || sending ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </form>
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
