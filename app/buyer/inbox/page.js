'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, Search, DollarSign, Home } from 'lucide-react';
import ChatWindow from '@/components/buyer/ChatWindow';

export default function InboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user?.id) {
      fetchConversations();

      // Set up polling to refresh conversations every 5 seconds
      const interval = setInterval(() => {
        fetchConversations();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Auto-select conversation from URL parameter
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === parseInt(conversationId));
      if (conversation) {
        setSelectedConversation(conversation);
      }
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = conversations.filter(conv => {
        const businessName = conv.lenders?.business_name?.toLowerCase() || '';
        const email = conv.lenders?.email?.toLowerCase() || '';
        const lastMessage = conv.last_message_preview?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();

        return businessName.includes(query) ||
               email.includes(query) ||
               lastMessage.includes(query);
      });
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/buyer/chat?action=get_conversations', {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setConversations(data.conversations || []);
        setFilteredConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 pt-12 lg:pt-0">
      {/* Left Panel - Conversation List */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] border-r border-slate-200 bg-white`}>
        {/* Header — compact */}
        <div className="p-3 border-b border-slate-200">
          <h1 className="text-base font-semibold text-slate-900 mb-2">Messages</h1>

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
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 p-8">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-slate-600 text-center">
                  Conversations will appear here when lenders contact you
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-3 cursor-pointer transition-all duration-200 rounded-xl ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-[#002A3A]/10 border border-[#002A3A]/20'
                      : 'bg-white border border-transparent hover:bg-[#F3F4F6]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with unread indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#002A3A] flex items-center justify-center text-white font-semibold text-sm">
                        {conversation.lenders?.business_name?.charAt(0)?.toUpperCase() || 'L'}
                      </div>
                      {conversation.unread_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#b29578] border-2 border-white rounded-full"></span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className={`truncate text-sm ${
                            conversation.unread_count > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-900'
                          }`}>
                            {conversation.lenders?.business_name || 'Lender'}
                          </h3>
                          {conversation.unread_count > 0 && (
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
    </div>
  );
}
