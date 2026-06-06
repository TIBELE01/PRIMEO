'use client';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="md:hidden p-2 text-gray-600">
        <Menu size={24} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative flex flex-col w-64 h-full bg-primary-900">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-primary-300 hover:text-white">
              <X size={20} />
            </button>
            <Sidebar />
          </div>
        </div>
      )}
    </>
  );
}
