import React, { ReactNode } from 'react';
import { TripProvider } from './TripContext';
import { DestinationProvider } from './DestinationContext';
import { UIProvider } from './UIContext';
import { SocialProvider } from './SocialContext';

interface AppContextProviderProps {
  children: ReactNode;
}

/**
 * Combined context provider that wraps all individual contexts
 * This replaces the monolithic SupabaseAppContext with a modular approach
 */
export const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
  return (
    <UIProvider>
      <TripProvider>
        <DestinationProvider>
          <SocialProvider>
            {children}
          </SocialProvider>
        </DestinationProvider>
      </TripProvider>
    </UIProvider>
  );
};

export default AppContextProvider;