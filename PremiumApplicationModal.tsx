import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc,
  orderBy,
  limit,
  setDoc
} from 'firebase/firestore';
import { MessageSquare, X, Send, User as UserIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ChatProps {
  currentUser: {
    uid: string;
    username: string;
    rank: 'Agent' | 'QA' | 'TL';
  };
}

interface ChatSession {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: any;
  otherUser?: any;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export default function Chat({ currentUser }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState<{ sender: string, text: string } | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Global Chat Listener for Notifications & Unread Status
  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unread = false;
      const lastReadMap = JSON.parse(localStorage.getItem(`lastRead_${currentUser.uid}`) || '{}');
      
      snapshot.docChanges().forEach((change) => {
        const chatData = change.doc.data() as ChatSession;
        const chatId = change.doc.id;
        
        // Skip if I am the sender
        if (chatData.lastSenderId === currentUser.uid) return;

        const lastReadTime = lastReadMap[chatId] || 0;
        const chatTime = chatData.updatedAt?.toMillis() || Date.now();

        if (chatTime > lastReadTime) {
          unread = true;

          // If it's a NEW message (added or modified very recently)
          if (change.type === 'modified' || change.type === 'added') {
            // Logic to prevent popup if chat is currently open and active
            if (!(isOpen && activeChat?.id === chatId) && chatData.lastSenderId) {
              // Fetch sender name for notification
              getDoc(doc(db, 'users', chatData.lastSenderId)).then(uSnap => {
                if (uSnap.exists()) {
                  const uData = uSnap.data();
                  setNotification({
                    sender: uData.username || uData.name || 'User',
                    text: chatData.lastMessage || 'Sent a message'
                  });
                  // Auto hide after 2 seconds
                  setTimeout(() => setNotification(null), 2000);
                }
              });
            }
          }
        }
      });

      // Check all chats unread status
      const anyUnread = snapshot.docs.some(d => {
        const data = d.data();
        if (data.lastSenderId === currentUser.uid) return false;
        const lastRead = lastReadMap[d.id] || 0;
        return (data.updatedAt?.toMillis() || 0) > lastRead;
      });

      setHasUnread(anyUnread);
    });

    return () => unsubscribe();
  }, [currentUser.uid, activeChat?.id, isOpen]);

  // Mark as read when opening a chat
  useEffect(() => {
    if (isOpen && activeChat) {
      const lastReadMap = JSON.parse(localStorage.getItem(`lastRead_${currentUser.uid}`) || '{}');
      lastReadMap[activeChat.id] = Date.now();
      localStorage.setItem(`lastRead_${currentUser.uid}`, JSON.stringify(lastReadMap));
      setHasUnread(false); // Optimistic clear
    }
  }, [isOpen, activeChat, currentUser.uid]);

  // Fetch Contacts based on rank
  useEffect(() => {
    if (!isOpen || view !== 'list') return;

    setLoading(true);
    // Agent -> Only TLs
    // TL -> Everyone (Agent, QA, TL)
    // QA -> TLs (Assuming same as Agent based on user instructions "Agent rank user... TL show korbe")
    
    const usersRef = collection(db, 'users');
    let q;
    if (currentUser.rank === 'Agent' || currentUser.rank === 'QA') {
      q = query(usersRef, where('rank', '==', 'TL'));
    } else {
      q = query(usersRef); // TL sees everyone
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== currentUser.uid);
      setContacts(userList);
      setLoading(false);
    }, (err) => {
      console.error('Contacts listener error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, view, currentUser.uid, currentUser.rank]);

  // Messages listener
  useEffect(() => {
    if (!activeChat) return;

    const messagesRef = collection(db, 'chats', activeChat.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }, (err) => {
      console.error('Messages listener error:', err);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const startChat = async (targetUser: any) => {
    setLoading(true);
    // Find or create chat session
    const chatID = [currentUser.uid, targetUser.id].sort().join('_');
    const chatRef = doc(db, 'chats', chatID);
    const chatSnap = await getDoc(chatRef);

    let sessionData: any;
    if (!chatSnap.exists()) {
      sessionData = {
        participants: [currentUser.uid, targetUser.id],
        updatedAt: serverTimestamp(),
      };
      await setDoc(chatRef, sessionData);
    } else {
      sessionData = chatSnap.data();
    }

    setActiveChat({ id: chatID, ...sessionData, otherUser: targetUser });
    setView('chat');
    setLoading(false);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeChat || sending) return;

    // Check if last message was from me (sequential rule)
    const canSend = !activeChat.lastSenderId || activeChat.lastSenderId !== currentUser.uid;
    if (!canSend) {
      alert("Please wait for a reply before sending another message.");
      return;
    }

    setSending(true);
    try {
      const msgData = {
        senderId: currentUser.uid,
        text: inputText.trim(),
        createdAt: serverTimestamp(),
      };

      // Add message to subcollection first to avoid race condition with lastSenderId rule
      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), msgData);

      // Then update chat session doc
      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: inputText.trim(),
        lastSenderId: currentUser.uid,
        updatedAt: serverTimestamp()
      });

      // Update local state temporarily for sequential check
      setActiveChat(prev => prev ? { ...prev, lastSenderId: currentUser.uid } : null);
      setInputText('');
    } catch (err: any) {
      if (err.message.includes('permissions')) {
        alert("Sequential messaging enforced: You must wait for a reply.");
      }
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      {/* Notification Popup */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 w-64 bg-blue-600 border border-blue-400 p-4 rounded-xl shadow-2xl z-[300]"
          >
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase font-black tracking-widest text-white/60">New Message</p>
              <p className="text-xs font-bold text-white truncate">{notification.sender}</p>
              <p className="text-[10px] text-white/80 line-clamp-1">{notification.text}</p>
            </div>
            <div className="absolute -bottom-1 right-8 w-2 h-2 bg-blue-600 rotate-45 border-r border-b border-blue-400" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gold-accent text-black rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        
        {/* Red Unread Dot */}
        {hasUnread && !isOpen && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-gold-accent shadow-lg"
          />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-20 right-0 w-[90vw] md:w-[400px] h-[550px] bg-card-bg border border-border-dark rounded-2xl shadow-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 bg-black/40 border-b border-border-dark flex items-center justify-between">
              <div className="flex items-center gap-3">
                {view === 'chat' && (
                  <button onClick={() => setView('list')} className="p-1 hover:bg-white/5 rounded">
                    <X className="w-4 h-4 rotate-45" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  {view === 'chat' ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-wider">{activeChat?.otherUser?.name || 'Chat'}</p>
                        <p className="text-[10px] text-stone-500 font-bold uppercase">{activeChat?.otherUser?.username}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5 text-gold-accent" />
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">Connect with People</h4>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-stone-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative bg-black/20">
              {view === 'list' ? (
                <div className="h-full overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <Loader2 className="w-6 h-6 animate-spin text-gold-accent" />
                      <p className="text-[10px] uppercase font-black tracking-widest text-stone-500">Searching contacts...</p>
                    </div>
                  ) : contacts.length > 0 ? (
                    <div className="grid gap-2">
                      {contacts.map(user => (
                        <button
                          key={user.id}
                          onClick={() => startChat(user)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-border-dark group text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-500 group-hover:bg-gold-accent/10 group-hover:text-gold-accent transition-colors">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-black text-white uppercase tracking-wider truncate">{user.name}</p>
                            <p className="text-[10px] text-stone-500 uppercase truncate">{user.rank} • {user.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <UserIcon className="w-12 h-12 text-stone-800 mb-4" />
                      <p className="text-xs text-stone-500 uppercase font-black tracking-widest">No contacts found</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div 
                    ref={scrollRef}
                    className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth pb-20"
                  >
                    {messages.map((msg, i) => {
                      const isMe = msg.senderId === currentUser.uid;
                      return (
                        <div key={msg.id || i} className={cn(
                          "flex flex-col max-w-[80%]",
                          isMe ? "ml-auto items-end" : "mr-auto items-start"
                        )}>
                          <div className={cn(
                            "px-4 py-3 rounded-2xl text-xs leading-relaxed",
                            isMe 
                              ? "bg-gold-accent text-black font-medium rounded-tr-none" 
                              : "bg-stone-800 text-stone-200 rounded-tl-none border border-border-dark"
                          )}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Sequential Check Notice */}
                  {activeChat?.lastSenderId === currentUser.uid && (
                    <div className="absolute bottom-16 left-0 right-0 px-4">
                      <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-2 text-[10px] text-blue-400 text-center uppercase tracking-wider font-black animate-pulse">
                        Waiting for reply...
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <form 
                    onSubmit={sendMessage}
                    className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-md border-t border-border-dark flex gap-2"
                  >
                    <input 
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 bg-white/5 border border-border-dark rounded-xl px-4 py-2 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-gold-accent"
                    />
                    <button 
                      type="submit"
                      disabled={sending || !inputText.trim() || activeChat?.lastSenderId === currentUser.uid}
                      className="w-10 h-10 bg-gold-accent text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
