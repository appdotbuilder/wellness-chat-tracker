
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { ChatMessage } from '../../../server/src/schema';

interface ChatInterfaceProps {
  userId: number;
  onDataUpdate: () => void;
}

export function ChatInterface({ userId, onDataUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getChatMessages.query({ userId, limit: 50 });
      setMessages(result);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      // Create user message
      const userMessage = await trpc.createChatMessage.mutate({
        user_id: userId,
        message: messageText,
        message_type: 'user'
      });

      setMessages((prev: ChatMessage[]) => [...prev, userMessage]);

      // Process the message for data extraction
      await trpc.processChatMessage.mutate(userMessage.id);

      // Reload messages to get system response
      await loadMessages();
      
      // Update dashboard data
      onDataUpdate();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatMessage = (message: ChatMessage) => {
    const isUser = message.message_type === 'user';
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[80%] p-3 rounded-lg ${
            isUser
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }`}
        >
          <p className="text-sm">{message.message}</p>
          {message.data_extracted && (
            <div className="mt-2 text-xs opacity-75">
              ✅ Data extracted and saved
            </div>
          )}
          <div className="text-xs opacity-75 mt-1">
            {message.created_at.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-96">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">👋 Welcome to your wellness chat!</p>
            <p className="text-sm">
              Tell me about your day, workouts, meals, or how you're feeling, and I'll help track everything for you.
            </p>
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <p>Try saying things like:</p>
              <p>"I ran for 30 minutes this morning"</p>
              <p>"I had a chicken salad for lunch"</p>
              <p>"I drank 2 glasses of water"</p>
              <p>"I slept 8 hours last night"</p>
            </div>
          </div>
        ) : (
          messages.map(formatMessage)
        )}
      </ScrollArea>

      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="Tell me about your wellness activities..."
            disabled={isSending}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending || !newMessage.trim()}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
