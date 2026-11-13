'use client';

import {createContext, useContext, type ReactNode} from 'react';
import {defaultContactEmail} from '@/lib/public-contact';

const ContactEmail = createContext(defaultContactEmail);

export function PublicContactProvider({email, children}: {email: string; children: ReactNode}) {
  return <ContactEmail.Provider value={email}>{children}</ContactEmail.Provider>;
}

export function usePublicContactEmail() {
  return useContext(ContactEmail);
}
