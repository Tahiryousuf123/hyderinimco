import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Paperclip, Search, Bot, User, Check, CheckCheck,
  Clock, AlertTriangle, RefreshCw, Maximize2, Minimize2, Phone, ShoppingBag,
  Tag, FileText, ChevronLeft, ShieldAlert, Sparkles, X, ChevronDown, CheckCircle2
} from 'lucide-react';

export default function WhatsAppLiveInbox({
  pin = '7860',
  authRole = 'superadmin',
  isExpanded = false,
  onToggleExpand = () => {}
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [convDetails, setConvDetails] = useState(null);
  const [stats, setStats] = useState({ totalConversations: 0, unreadMessages: 0, openConversations: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat' | 'drawer'
  const [sseConnected, setSseConnected] = useState(false);
  const [actionError, setActionError] = useState('');
  const [cannedMenuOpen, setCannedMenuOpen] = useState(false);
  const [globalAiActive, setGlobalAiActive] = useState(true);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [convDetails?.messages]);

  // 1. Fetch Conversations List
  const fetchConversations = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const headers = { 'X-Admin-PIN': pin };
      const q = new URLSearchParams();
      if (filterStatus && filterStatus !== 'all') q.append('status', filterStatus);
      if (searchQuery.trim()) q.append('search', searchQuery.trim());

      const [cRes, sRes] = await Promise.all([
        fetch(`/api/inbox/conversations?${q.toString()}`, { headers }),
        fetch('/api/inbox/stats', { headers })
      ]);

      const cData = await cRes.json();
      const sData = await sRes.json();

      if (cData.success) {
        setConversations(cData.conversations || []);
        if (!selectedConvId && cData.conversations?.length > 0 && window.innerWidth >= 768) {
          setSelectedConvId(cData.conversations[0].id);
        }
      }
      if (sData.success) {
        setStats(sData.stats || {});
      }
    } catch (err) {
      console.warn('[Inbox] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Conversation Details
  const fetchDetails = async (convId) => {
    if (!convId) return;
    setDetailsLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/inbox/conversations/${convId}`, {
        headers: { 'X-Admin-PIN': pin }
      });
      const data = await res.json();
      if (data.success) {
        setConvDetails(data);
        // Mark as read
        fetch(`/api/inbox/conversations/${convId}/read`, {
          method: 'POST',
          headers: { 'X-Admin-PIN': pin }
        }).catch(() => {});
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
      }
    } catch (err) {
      console.warn('[Inbox] Details error:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedConvId) {
      fetchDetails(selectedConvId);
    }
  }, [selectedConvId]);

  // 3. Real-Time SSE Setup
  useEffect(() => {
    let es = null;
    let retryTimeout = null;

    const connectSSE = () => {
      try {
        es = new EventSource(`/api/inbox/events?pin=${encodeURIComponent(pin)}`);

        es.addEventListener('connected', () => {
          setSseConnected(true);
        });

        es.addEventListener('new_message', (e) => {
          try {
            const msg = JSON.parse(e.data);
            setConvDetails(prev => {
              if (!prev || prev.conversation?.id !== msg.conversationId) return prev;
              const exists = prev.messages?.some(m => m.id === msg.id);
              if (exists) return prev;
              return {
                ...prev,
                messages: [...(prev.messages || []), msg],
                conversation: {
                  ...prev.conversation,
                  lastMessage: {
                    id: msg.id,
                    text: msg.text,
                    sender: msg.sender,
                    timestamp: msg.timestamp
                  }
                }
              };
            });

            setConversations(prev => {
              const list = [...prev];
              const idx = list.findIndex(c => c.id === msg.conversationId);
              if (idx >= 0) {
                const item = { ...list[idx] };
                item.lastMessage = {
                  id: msg.id,
                  text: msg.text,
                  sender: msg.sender,
                  timestamp: msg.timestamp
                };
                if (msg.sender === 'customer' && selectedConvId !== msg.conversationId) {
                  item.unreadCount = (item.unreadCount || 0) + 1;
                }
                list.splice(idx, 1);
                return [item, ...list];
              } else {
                fetchConversations(false);
                return list;
              }
            });
          } catch (err) {}
        });

        es.addEventListener('message_status', (e) => {
          try {
            const st = JSON.parse(e.data);
            setConvDetails(prev => {
              if (!prev || prev.conversation?.id !== st.conversationId) return prev;
              return {
                ...prev,
                messages: (prev.messages || []).map(m => m.id === st.id ? { ...m, status: st.status } : m)
              };
            });
          } catch (err) {}
        });

        es.addEventListener('conversation_updated', (e) => {
          try {
            const upd = JSON.parse(e.data);
            setConversations(prev => prev.map(c => c.id === upd.id ? { ...c, ...upd } : c));
            setConvDetails(prev => {
              if (!prev || prev.conversation?.id !== upd.id) return prev;
              return { ...prev, conversation: { ...prev.conversation, ...upd } };
            });
          } catch (err) {}
        });

        es.addEventListener('unread_count_updated', (e) => {
          try {
            const d = JSON.parse(e.data);
            setConversations(prev => prev.map(c => c.id === d.conversationId ? { ...c, unreadCount: d.unreadCount } : c));
          } catch (err) {}
        });

        es.addEventListener('automation_changed', (e) => {
          try {
            const d = JSON.parse(e.data);
            if (typeof d.aiAutoReplyEnabled === 'boolean') setGlobalAiActive(d.aiAutoReplyEnabled);
          } catch (err) {}
        });

        es.onerror = () => {
          setSseConnected(false);
          if (es) es.close();
          retryTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        setSseConnected(false);
        retryTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (es) es.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [pin]);

  // 4. Send Manual Agent Outbound Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!replyText.trim() && !mediaUrl.trim()) || sending || !selectedConvId) return;

    setSending(true);
    setActionError('');
    try {
      const res = await fetch(`/api/inbox/conversations/${selectedConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': pin
        },
        body: JSON.stringify({
          customerPhone: convDetails?.conversation?.customerPhone,
          text: replyText.trim(),
          mediaUrl: mediaUrl.trim() || null,
          mediaType: mediaType || null
        })
      });

      const data = await res.json();
      if (data.success) {
        setReplyText('');
        setMediaUrl('');
        setMediaType('');
        if (data.message) {
          setConvDetails(prev => {
            if (!prev) return prev;
            return { ...prev, messages: [...(prev.messages || []), data.message] };
          });
        }
      } else {
        if (data.windowExpired) {
          setActionError('⚠️ Meta 24-Hour Customer Service Window has expired. You cannot send free-form messages. The customer must message first, or an approved WhatsApp template must be sent.');
        } else {
          setActionError(data.error || 'Failed to send message.');
        }
      }
    } catch (err) {
      setActionError('Network failure while sending reply.');
    } finally {
      setSending(false);
    }
  };

  // 5. Toggle Per-Chat AI Automation
  const handleToggleChatAutomation = async () => {
    if (!selectedConvId || !convDetails) return;
    const current = convDetails.conversation?.automationEnabled !== false;
    const nextVal = !current;
    try {
      const res = await fetch(`/api/inbox/conversations/${selectedConvId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': pin
        },
        body: JSON.stringify({ automationEnabled: nextVal })
      });
      const data = await res.json();
      if (data.success) {
        setConvDetails(prev => ({
          ...prev,
          conversation: { ...prev.conversation, automationEnabled: nextVal }
        }));
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, automationEnabled: nextVal } : c));
      }
    } catch (err) {
      alert('Failed to update automation state');
    }
  };

  // 6. Update Status
  const handleUpdateStatus = async (status) => {
    if (!selectedConvId) return;
    try {
      const res = await fetch(`/api/inbox/conversations/${selectedConvId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': pin
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setConvDetails(prev => ({
          ...prev,
          conversation: { ...prev.conversation, status }
        }));
        setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, status } : c));
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // 7. Add Internal Note
  const handleAddNote = async (e) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim() || !selectedConvId) return;
    try {
      const res = await fetch(`/api/inbox/conversations/${selectedConvId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-PIN': pin
        },
        body: JSON.stringify({ text: newNoteText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setNewNoteText('');
        setConvDetails(prev => ({
          ...prev,
          conversation: {
            ...prev.conversation,
            internalNotes: [...(prev.conversation?.internalNotes || []), data.note]
          }
        }));
      }
    } catch (err) {
      alert('Failed to add note');
    }
  };

  // 8. Format Relative Time
  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Canned Responses
  const cannedTemplates = [
    { title: '🥟 Delivery Rates', text: 'Assalam o Alaikum! 🥟 Hamari delivery rates yeh hain:\n- North Nazimabad: Rs. 150/-\n- Central / Gulberg / Buffer Zone: Rs. 200/-\n- Gulshan / DHA / Clifton: Rs. 250/-\nRs. 2500+ orders par Free Delivery hai!' },
    { title: '💳 Bank Payment Details', text: 'Hamara official payment account details:\nBank: Meezan Bank Ltd\nAccount Title: Hyderi Nimco\nAccount No: 0101-0102030405\nRaast ID: 03362438422\nBaraye meherbani payment slip screenshot yahan share karein.' },
    { title: '📍 Store Location & Timings', text: 'Hyderi Nimco & Frozen Shop Location:\nShop # 20, 21, Burhani Bagh, Block-E, Hydri, North Nazimabad, Karachi.\nTimings: 10:00 AM - 11:00 PM (Rozana open)\nHelpline: 0336-2438422' }
  ];

  return (
    <div className={`flex flex-col h-full bg-slate-100 text-gray-800 select-text overflow-hidden ${isExpanded ? 'fixed inset-0 z-[99999]' : ''}`}>
      {/* Top Status Bar */}
      <div className="bg-emeraldBrand-950 text-white px-4 py-2.5 flex items-center justify-between border-b border-goldBrand-500/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-emeraldBrand-900 px-2.5 py-1 rounded-full border border-goldBrand-500/20 text-[11px] font-bold">
            <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{sseConnected ? 'LIVE SSE CONNECTED' : 'CONNECTING...'}</span>
          </div>
          <span className="text-xs text-goldBrand-300 font-bold hidden sm:inline">
            Official WhatsApp CRM (+92 325 2747343)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {stats.unreadMessages > 0 && (
            <span className="bg-red-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
              {stats.unreadMessages} unread
            </span>
          )}

          <button
            onClick={() => fetchConversations()}
            className="p-1.5 hover:bg-emeraldBrand-900 rounded-lg text-goldBrand-300 hover:text-white transition-colors"
            title="Refresh Inbox"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onToggleExpand}
            className="px-2.5 py-1 bg-emeraldBrand-900 hover:bg-emeraldBrand-800 text-goldBrand-200 border border-goldBrand-400/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
            title={isExpanded ? 'Collapse' : 'Expand Fullscreen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMN 1: Conversations List */}
        <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col shrink-0 ${
          mobileView !== 'list' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-gray-200 space-y-2.5 bg-gray-50/70">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, or message..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-emeraldBrand-700 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar text-[11px] font-bold">
              {['all', 'unread', 'open', 'pending', 'resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all whitespace-nowrap ${
                    filterStatus === st
                      ? 'bg-emeraldBrand-900 text-goldBrand-200 shadow-xs font-black'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30 text-emeraldBrand-900" />
                <p className="text-xs font-bold">No conversations found</p>
                <p className="text-[11px] text-gray-400">Incoming WhatsApp messages will appear here instantly.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;
                const hasUnread = (conv.unreadCount || 0) > 0;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setMobileView('chat');
                    }}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 hover:bg-emerald-50/50 ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emeraldBrand-800' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-emeraldBrand-900 text-goldBrand-300 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                      {conv.customerName ? conv.customerName.charAt(0).toUpperCase() : 'C'}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-gray-900 truncate">
                          {conv.customerName || 'WhatsApp Customer'}
                        </h4>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatTime(conv.lastMessage?.timestamp || conv.updatedAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-500 font-mono truncate mb-1">
                        +{conv.customerPhone}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${hasUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                          {conv.lastMessage?.sender === 'bot' && <span className="text-amber-600 font-semibold mr-1">🤖</span>}
                          {conv.lastMessage?.sender === 'agent' && <span className="text-emerald-700 font-semibold mr-1">👤</span>}
                          {conv.lastMessage?.text || '[Media Attachment]'}
                        </p>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {conv.automationEnabled === false ? (
                            <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Manual</span>
                          ) : (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">AI</span>
                          )}

                          {hasUnread && (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: Message Thread & Composer */}
        <div className={`flex-1 flex flex-col min-w-0 bg-[#e5ddd5]/30 ${
          mobileView !== 'chat' ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedConvDetails ? (
            <>
              {/* Chat Thread Header */}
              <div className="bg-white px-4 py-2.5 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-emeraldBrand-900 text-goldBrand-300 flex items-center justify-center font-bold text-sm shrink-0">
                    {convDetails.customer?.name?.charAt(0) || 'C'}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                      <span>{convDetails.customer?.name || 'Customer'}</span>
                      <span className="font-normal text-xs text-gray-500 font-mono">
                        +{convDetails.conversation?.customerPhone}
                      </span>
                    </h3>

                    {/* 24-Hour Window Badge */}
                    <div className="flex items-center gap-2 mt-0.5">
                      {convDetails.isWindowOpen ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          24h Service Window Active (Free-form replies allowed)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          24h Window Expired (Customer must message first)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-2">
                  <select
                    value={convDetails.conversation?.status || 'open'}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="text-xs font-bold bg-gray-100 border border-gray-300 rounded-xl px-2.5 py-1.5 outline-none"
                  >
                    <option value="new">New</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>

                  <button
                    onClick={() => setMobileView(mobileView === 'drawer' ? 'chat' : 'drawer')}
                    className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <User className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px]">
                {convDetails.messages?.map((msg) => {
                  const isCustomer = msg.sender === 'customer';
                  const isBot = msg.sender === 'bot';
                  const isAgent = msg.sender === 'agent';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div className="text-[10px] text-gray-400 mb-0.5 px-1 font-semibold flex items-center gap-1">
                        {isCustomer && <span>{convDetails.customer?.name || 'Customer'}</span>}
                        {isBot && <span className="text-amber-700 font-bold">🤖 AI Sales Agent</span>}
                        {isAgent && <span className="text-emerald-700 font-bold">👤 {msg.senderName || 'Store Staff'}</span>}
                        <span>•</span>
                        <span>{formatTime(msg.timestamp)}</span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-md p-3 rounded-2xl text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                          isCustomer
                            ? 'bg-white text-gray-800 rounded-tl-xs border border-gray-200'
                            : isBot
                            ? 'bg-[#FFF9E6] text-gray-900 rounded-tr-xs border border-amber-200'
                            : 'bg-emerald-700 text-white rounded-tr-xs'
                        }`}
                      >
                        {/* Media Display */}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                            <img
                              src={msg.mediaUrl}
                              alt="WhatsApp Media"
                              className="max-h-60 w-auto object-contain cursor-pointer"
                              onClick={() => window.open(msg.mediaUrl, '_blank')}
                            />
                          </div>
                        )}

                        {msg.type === 'document' && msg.mediaUrl && (
                          <a
                            href={msg.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2 bg-black/5 rounded-lg mb-2 font-bold hover:underline"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Download {msg.mediaFilename || 'Document'}</span>
                          </a>
                        )}

                        {msg.text}

                        {/* Status Ticks for Outbound */}
                        {!isCustomer && (
                          <div className="flex justify-end items-center gap-1 mt-1 text-[10px] opacity-75">
                            {msg.status === 'sent' && <Check className="w-3 h-3" />}
                            {(msg.status === 'delivered' || msg.status === 'read') && (
                              <CheckCheck className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-blue-400' : ''}`} />
                            )}
                            {msg.status === 'failed' && (
                              <span className="text-red-300 font-bold">Failed</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Action Error Warning */}
              {actionError && (
                <div className="bg-red-50 text-red-800 p-2.5 px-4 text-xs font-bold border-t border-red-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                  <button onClick={() => setActionError('')} className="text-red-600 hover:text-red-900 font-bold">✕</button>
                </div>
              )}

              {/* Canned Responses Popover */}
              {cannedMenuOpen && (
                <div className="p-3 bg-white border-t border-gray-200 flex flex-wrap gap-2 animate-in fade-in duration-200">
                  <span className="text-[11px] font-bold text-gray-500 w-full mb-1">Quick Canned Replies:</span>
                  {cannedTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setReplyText(tpl.text);
                        setCannedMenuOpen(false);
                      }}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-900 text-gray-700 text-xs rounded-lg border border-gray-200 transition-all font-semibold"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Message Composer */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCannedMenuOpen(!cannedMenuOpen)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
                  title="Quick Canned Replies"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </button>

                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={convDetails.isWindowOpen ? "Type a reply to customer..." : "24h window expired: Free-form blocked"}
                  disabled={!convDetails.isWindowOpen || sending}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:border-emeraldBrand-800 focus:bg-white disabled:opacity-60 transition-all"
                />

                <button
                  type="submit"
                  disabled={!convDetails.isWindowOpen || sending || !replyText.trim()}
                  className="px-4 py-2.5 bg-emeraldBrand-900 hover:bg-emeraldBrand-800 disabled:opacity-40 text-goldBrand-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 space-y-3">
              <MessageSquare className="w-12 h-12 opacity-20 text-emeraldBrand-900" />
              <h3 className="text-sm font-bold text-gray-700">Select a conversation to begin</h3>
              <p className="text-xs text-gray-400 text-center max-w-sm">
                Chat history, live AI responses, and customer orders will appear here.
              </p>
            </div>
          )}
        </div>

        {/* COLUMN 3: Customer Profile & Order History Drawer */}
        {selectedConvDetails && (
          <div className={`w-full lg:w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shrink-0 ${
            mobileView !== 'drawer' ? 'hidden lg:flex' : 'flex'
          }`}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/60">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5 font-serifBrand">
                <User className="w-4 h-4 text-emeraldBrand-900" />
                <span>Customer Profile</span>
              </h3>
              <button
                onClick={() => setMobileView('chat')}
                className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-5 text-xs">
              {/* Profile Card */}
              <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/60 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emeraldBrand-900 text-goldBrand-300 flex items-center justify-center font-bold text-lg shadow-sm">
                    {convDetails.customer?.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{convDetails.customer?.name || 'Customer'}</h4>
                    <p className="font-mono text-gray-600 text-xs">+{convDetails.conversation?.customerPhone}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/40 flex items-center justify-between text-[11px] text-gray-600">
                  <span>Total Messages:</span>
                  <b className="text-gray-900">{convDetails.customer?.totalMessages || 0}</b>
                </div>
              </div>

              {/* Per-Chat AI Automation Switch */}
              <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <Bot className="w-4 h-4 text-emerald-700" />
                    <span>AI Sales Bot</span>
                  </div>
                  <button
                    onClick={handleToggleChatAutomation}
                    className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${
                      convDetails.conversation?.automationEnabled !== false
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-black'
                    }`}
                  >
                    {convDetails.conversation?.automationEnabled !== false ? '🤖 ON' : '👤 MANUAL'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  {convDetails.conversation?.automationEnabled !== false
                    ? 'AI is automatically replying to this customer.'
                    : 'Human takeover active. AI will not respond to this chat.'}
                </p>
              </div>

              {/* Internal Staff Notes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    <span>Staff Internal Notes</span>
                  </h4>
                  <span className="text-[10px] text-gray-400">
                    {convDetails.conversation?.internalNotes?.length || 0}
                  </span>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {convDetails.conversation?.internalNotes?.map((n, i) => (
                    <div key={i} className="bg-amber-50/70 p-2 rounded-xl border border-amber-200/60 text-[11px]">
                      <p className="text-gray-800">{n.text}</p>
                      <div className="flex justify-between items-center text-[9px] text-gray-400 mt-1">
                        <span>{n.author}</span>
                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emeraldBrand-800"
                  />
                  <button
                    type="submit"
                    disabled={!newNoteText.trim()}
                    className="px-2.5 py-1.5 bg-gray-800 text-white rounded-xl font-bold text-xs disabled:opacity-40"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Linked Website Orders */}
              <div className="space-y-2.5 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Linked Website Orders</span>
                  </h4>
                  <span className="text-[10px] font-bold text-gray-400">
                    {convDetails.orders?.length || 0}
                  </span>
                </div>

                <div className="space-y-2">
                  {convDetails.orders?.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">No previous website orders found for this phone number.</p>
                  ) : (
                    convDetails.orders?.map((ord) => (
                      <div key={ord.id} className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-mono font-bold text-emeraldBrand-900">#{ord.orderRef || ord.id}</span>
                          <span className="font-bold text-gray-900">Rs. {ord.totalAmount}/-</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-500">
                          <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                          <span className="capitalize px-1.5 py-0.5 rounded bg-white font-bold border border-gray-200">
                            {ord.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
