import React, { useState, useEffect, useRef } from 'react';
import { userService, UserSearchResult } from '../../services/userService';
import { Search, Plus, Loader } from 'lucide-react';
import AvatarUpload from './AvatarUpload';

interface UserSearchComponentProps {
  onUserSelect: (user: UserSearchResult) => void;
  selectedUsers?: UserSearchResult[];
  placeholder?: string;
  maxResults?: number;
  disabled?: boolean;
  excludeUserIds?: string[];
}

const UserSearchComponent: React.FC<UserSearchComponentProps> = ({
  onUserSelect,
  selectedUsers = [],
  placeholder = "Nach Benutzern suchen...",
  maxResults = 10,
  disabled = false,
  excludeUserIds = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchTerm.trim());
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (term: string) => {
    try {
      setIsSearching(true);
      setError(null);
      
      const results = await userService.searchUsers(term, maxResults);
      
      // Filter out excluded users and already selected users
      const filteredResults = results.filter(user => 
        !excludeUserIds.includes(user.id) &&
        !selectedUsers.some(selected => selected.id === user.id)
      );
      
      setSearchResults(filteredResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Suche fehlgeschlagen');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserClick = (user: UserSearchResult) => {
    onUserSelect(user);
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (searchResults.length > 0) {
      setShowResults(true);
    }
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Search 
          size={18} 
          style={{
            position: 'absolute',
            left: '0.75rem',
            color: 'var(--color-text-secondary)',
            zIndex: 1
          }} 
        />
        
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.75rem 0.75rem 0.75rem 2.5rem',
            border: '2px solid var(--color-border)',
            borderRadius: '8px',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '1rem',
            transition: 'border-color var(--transition-fast)',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--color-primary-ocean)';
            e.target.style.boxShadow = '0 0 0 3px rgba(74, 144, 164, 0.1)';
            handleInputFocus();
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border)';
            e.target.style.boxShadow = 'none';
          }}
        />
        
        {isSearching && (
          <Loader 
            size={18} 
            className="animate-spin"
            style={{
              position: 'absolute',
              right: '0.75rem',
              color: 'var(--color-primary-ocean)'
            }} 
          />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto',
          marginTop: '0.25rem'
        }}>
          {error && (
            <div style={{
              padding: '0.75rem',
              color: 'var(--color-error)',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          {!error && searchResults.length === 0 && searchTerm.length >= 2 && !isSearching && (
            <div style={{
              padding: '0.75rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              Keine Benutzer gefunden für "{searchTerm}"
            </div>
          )}
          
          {!error && searchResults.length === 0 && searchTerm.length < 2 && (
            <div style={{
              padding: '0.75rem',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              Mindestens 2 Zeichen eingeben
            </div>
          )}
          
          {searchResults.map((user, index) => (
            <div
              key={user.id}
              onClick={() => handleUserClick(user)}
              style={{
                padding: '0.75rem',
                cursor: 'pointer',
                borderBottom: index < searchResults.length - 1 ? '1px solid var(--color-border)' : 'none',
                transition: 'background-color var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                {/* Avatar */}
                <AvatarUpload 
                  currentAvatarUrl={user.avatar_url}
                  size="small"
                  editable={false}
                />
                
                {/* User Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.125rem'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.875rem'
                    }}>
                      @{user.nickname}
                    </span>
                    
                    {user.is_verified && (
                      <span style={{
                        background: 'var(--color-success)',
                        color: 'white',
                        fontSize: '0.625rem',
                        padding: '0.125rem 0.25rem',
                        borderRadius: '3px',
                        lineHeight: 1
                      }}>
                        ✓
                      </span>
                    )}
                  </div>
                  
                  {user.display_name && (
                    <div style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.75rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {user.display_name}
                    </div>
                  )}
                </div>
                
                {/* Add Icon */}
                <Plus 
                  size={18} 
                  style={{ 
                    color: 'var(--color-primary-ocean)',
                    flexShrink: 0
                  }} 
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSearchComponent;