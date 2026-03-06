'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext';
import { MessageCircle, Search, DollarSign, Home, Pin } from 'lucide-react';
import ChatWindow from '@/components/buyer/ChatWindow';

const AVATAR_COLORS = ['#0F766E', '#2563EB', '#7C3AED', '#C2410C', '#BE185D', '#0369A1', '#047857', '#4F46E5'];

function getAvatarColor(seed = '') {
  const str = String(seed || 'chat');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function InboxPage() {
  const { user } = useAuth();
  const { setPageTitle } = useBuyerPageTitle();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatTab, setChatTab] = useState('all'); // all | unread | unresponded
  const [contextMenu, setContextMenu] = useState(null); // {x,y,conversation}
  const searchParams = useSearchParams();

  const sellerIdFromUrl = searchParams.get('seller_id');
  const dealIdFromUrl = searchParams.get('deal_id');

  useEffect(() => {
    setPageTitle('Messages');
    return () => setPageTitle('');
  }, [setPageTitle]);

  useEffect(() => {
    if (user?.id) {
      fetchConversations();

      const interval = setInterval(() => {
        fetchConversations();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Heartbeat for message presence: only when tab is visible, so we skip email if user is on messages
  useEffect(() => {
    if (!user?.id || typeof document === 'undefined') return;
    let intervalId = null;
    const sendHeartbeat = () => {
      if (document.visibilityState === 'visible') {
        fetch('/api/buyer/chat', {
          method: 'POST',
          headers: { Authorization: `Bearer ${user.id}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'heartbeat' })
        }).catch(() => {});
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
        intervalId = setInterval(sendHeartbeat, 25000);
      } else {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
      }
    };
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
      intervalId = setInterval(sendHeartbeat, 25000);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.id]);

  // Auto-select conversation from URL: conversation id, or openConversationId from API (seller_id + deal_id flow)
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => String(c.id) === String(conversationId));
      if (conversation) setSelectedConversation(conversation);
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(conv => {
        const businessName = (conv.lenders?.business_name || '').toLowerCase();
        const contactName = (conv.lenders?.contact_person_name || '').toLowerCase();
        const email = (conv.lenders?.email || '').toLowerCase();
        const address = (conv.property_address || '').toLowerCase();
        const lastMessage = (conv.last_message_preview || '').toLowerCase();
        return businessName.includes(query) ||
               contactName.includes(query) ||
               email.includes(query) ||
               address.includes(query) ||
               lastMessage.includes(query);
      });
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  useEffect(() => {
    const close = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const fetchConversations = async (openId = null) => {
    if (!user?.id) return;
    try {
      let url = '/api/buyer/chat?action=get_conversations';
      if (sellerIdFromUrl) url += `&seller_id=${encodeURIComponent(sellerIdFromUrl)}`;
      if (dealIdFromUrl) url += `&deal_id=${encodeURIComponent(dealIdFromUrl)}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user.id}` }
      });
      const data = await response.json();

      if (response.ok) {
        const list = data.conversations || [];
        setConversations(list);
        setFilteredConversations(list);
        if (openId !== false && (data.openConversationId != null || openId != null)) {
          const id = data.openConversationId ?? openId;
          const conv = list.find(c => c.id === id);
          if (conv) setSelectedConversation(conv);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateConversationPref = async (conversationId, patch) => {
    if (!user?.id) return;
    const id = conversationId;
    if (patch.is_blocked !== undefined && patch.is_blocked && selectedConversation?.id === id) {
      setSelectedConversation(null);
    }
    // Optimistic update so UI responds immediately
    setConversations((prev) => {
      if (patch.is_blocked) return prev.filter((c) => c.id !== id);
      return prev.map((c) => {
        if (c.id !== id) return c;
        if (patch.is_pinned !== undefined) return { ...c, is_pinned: !!patch.is_pinned };
        if (patch.mark_unread !== undefined) return { ...c, mark_unread: !!patch.mark_unread, has_unread: true, unread_count: Math.max(c.unread_count || 0, 1) };
        return c;
      });
    });
    setFilteredConversations((prev) => {
      if (patch.is_blocked) return prev.filter((c) => c.id !== id);
      return prev.map((c) => {
        if (c.id !== id) return c;
        if (patch.is_pinned !== undefined) return { ...c, is_pinned: !!patch.is_pinned };
        if (patch.mark_unread !== undefined) return { ...c, mark_unread: !!patch.mark_unread, has_unread: true, unread_count: Math.max(c.unread_count || 0, 1) };
        return c;
      });
    });
    const res = await fetch('/api/buyer/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`
      },
      body: JSON.stringify({ action: 'update_conversation_pref', conversationId: id, ...patch })
    });
    fetchConversations(false);
  };

  const deleteConversation = async (conversationId) => {
    if (!user?.id) return;
    const res = await fetch('/api/buyer/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`
      },
      body: JSON.stringify({ action: 'delete_conversation', conversationId })
    });
    if (res.ok) {
      if (selectedConversation?.id === conversationId) setSelectedConversation(null);
      fetchConversations(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);

    // Wait a bit for messages to be marked as read, then refresh conversations
    setTimeout(() => {
      fetchConversations();
    }, 500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const displayedConversations = (filteredConversations || [])
    .filter((c) => {
      if (chatTab === 'all') return true;
      if (chatTab === 'unread') return !!c.has_unread || (c.unread_count ?? 0) > 0;
      if (chatTab === 'unresponded') return !!c.is_unresponded;
      return true;
    })
    .sort((a, b) => {
      if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Left Panel - Conversation List */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] border-r border-slate-200 bg-white`}>
        {/* Header — compact */}
        <div className="p-3 border-b border-slate-200">
          <h1 className="hidden lg:block text-base font-semibold text-slate-900 mb-2">Messages</h1>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all"
            />
          </div>
          <div className="mt-2 grid w-full grid-cols-3 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button type="button" onClick={() => setChatTab('all')} className={`w-full px-2.5 py-1 rounded-md ${chatTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>All</button>
            <button type="button" onClick={() => setChatTab('unread')} className={`w-full px-2.5 py-1 rounded-md ${chatTab === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>Unread</button>
            <button type="button" onClick={() => setChatTab('unresponded')} className={`w-full px-2.5 py-1 rounded-md ${chatTab === 'unresponded' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>Unresponded</button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900"></div>
            </div>
          ) : displayedConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 p-8">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                {searchQuery
                  ? 'No conversations found'
                  : chatTab === 'unread'
                    ? 'No unread conversations'
                    : chatTab === 'unresponded'
                      ? 'No unresponded conversations'
                      : 'No conversations yet'}
              </p>
              {!searchQuery && chatTab === 'all' && (
                <p className="text-xs text-slate-600 text-center">
                  Conversations will appear here when you message agents or lenders
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayedConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, conversation });
                  }}
                  className={`p-3 cursor-pointer transition-all duration-200 rounded-xl ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-[#002A3A]/10 border border-[#002A3A]/20'
                      : 'bg-white border border-transparent hover:bg-[#F3F4F6]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar: property thumbnail or initial */}
                    <div className="relative flex-shrink-0">
                      {conversation.property_thumbnail_url ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                          <img
                            src={conversation.property_thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                          style={{ backgroundColor: getAvatarColor(conversation.lenders?.business_name || conversation.seller_id || conversation.lender_id || conversation.id) }}
                        >
                          {conversation.lenders?.business_name?.charAt(0)?.toUpperCase() || (conversation.financing_requests ? 'L' : 'S')}
                        </div>
                      )}
                      {conversation.unread_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#b29578] border-2 border-white rounded-full"></span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className={`truncate text-sm ${
                            (conversation.has_unread || (conversation.unread_count ?? 0) > 0) ? 'font-bold text-slate-900' : 'font-medium text-slate-900'
                          }`}>
                            {conversation.financing_requests
                              ? (conversation.lenders?.business_name || 'Lender')
                              : (() => {
                                  const first = (conversation.lenders?.contact_person_name || conversation.lenders?.business_name || 'Seller').trim().split(/\s+/)[0] || 'Seller';
                                  const addr = conversation.property_address || 'Property';
                                  return `${first} - ${addr}`;
                                })()}
                          </h3>
                          {conversation.is_pinned && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700" title="Pinned">
                              <Pin className="w-3 h-3" />
                            </span>
                          )}
                          {((conversation.unread_count ?? 0) > 0) && (
                            <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-[#002A3A] rounded-full">
                              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-600 flex-shrink-0">
                          {formatDate(conversation.last_message_at)}
                        </span>
                      </div>

                      {/* Last Message Preview */}
                      <p className={`text-xs truncate mb-2 ${
                        conversation.unread_count > 0 ? 'text-slate-800 font-medium' : 'text-slate-600'
                      }`}>
                        {conversation.last_message_preview || 'No messages yet'}
                      </p>

                      {/* Property Type and Loan Amount as badges */}
                      {conversation.financing_requests && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {conversation.financing_requests.property_type && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#002A3A]/10 text-[#002A3A] text-[10px] rounded-md font-medium">
                              <Home className="w-2.5 h-2.5" />
                              {conversation.financing_requests.property_type}
                            </span>
                          )}
                          {conversation.financing_requests.loan_amount && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#b29578]/10 text-[#b29578] text-[10px] rounded-md font-semibold">
                              <DollarSign className="w-2.5 h-2.5" />
                              {formatCurrency(conversation.financing_requests.loan_amount)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat Window */}
      <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-white`}>
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            lender={selectedConversation.lenders}
            financingRequest={selectedConversation.financing_requests}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-200">
                <MessageCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">Select a conversation</h3>
              <p className="text-sm text-slate-600">
                Choose a conversation from the list to view messages
              </p>
            </div>
          </div>
        )}
      </div>
      {contextMenu?.conversation && (
        <div
          className="fixed z-[90] w-44 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-[0_12px_32px_rgba(15,23,42,0.18)] p-1.5"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</div>
          <button className="w-full text-left text-sm px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => { updateConversationPref(contextMenu.conversation.id, { is_pinned: !contextMenu.conversation.is_pinned }); setContextMenu(null); }}>
            {contextMenu.conversation.is_pinned ? 'Unpin user' : 'Pin user'}
          </button>
          <button className="w-full text-left text-sm px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => { updateConversationPref(contextMenu.conversation.id, { mark_unread: true }); setContextMenu(null); }}>
            Mark as unread
          </button>
          <div className="my-1 border-t border-slate-200" />
          <button className="w-full text-left text-sm px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors" onClick={() => { deleteConversation(contextMenu.conversation.id); setContextMenu(null); }}>
            Delete chat
          </button>
          <button className="w-full text-left text-sm px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors" onClick={() => { const id = contextMenu.conversation.id; updateConversationPref(id, { is_blocked: true }); setContextMenu(null); }}>
            Block user
          </button>
        </div>
      )}
    </div>
  );
}
