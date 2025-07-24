import React, { useState, useEffect } from 'react';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded shadow border ${className}`}>{children}</div>;
}

function Button({ children, size = 'md', ...props }: any) {
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-4 py-2';
  return <button className={`bg-blue-600 text-white rounded ${sizeClass}`} {...props}>{children}</button>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-2 py-1 text-xs bg-gray-200 rounded mr-1">{children}</span>;
}

function LoadingSpinner() {
  return <div className="flex items-center justify-center h-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  user_id: string;
  assigned_to?: string;
  profiles?: {
    email: string;
    display_name?: string;
  };
}

export default function SupportTicketDashboard() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const response = await fetch('/api/admin?type=support_tickets', { headers });
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Support Tickets</h2>
      {tickets.length === 0 ? (
        <div className="text-gray-500">No support tickets found.</div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">{ticket.subject}</div>
                <div className="text-xs text-gray-500">{ticket.profiles?.email || 'Unknown user'} • {new Date(ticket.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center space-x-2 mt-2 md:mt-0">
                <Badge>{ticket.priority}</Badge>
                <Badge>{ticket.status}</Badge>
                <Button size="sm">View</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
