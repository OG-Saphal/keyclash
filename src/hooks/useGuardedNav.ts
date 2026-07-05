import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../store/useMultiplayerStore';

/**
 * Wrap any nav element (logo, "Home" link, etc.) with this to get a
 * confirm-before-you-lose-your-seat prompt whenever the user is currently in
 * a multiplayer room. If they're not in a room, it behaves like a normal
 * navigate — nothing changes for the 95% case.
 *
 * Usage in Header.tsx:
 *   const handleLogoClick = useGuardedNav('/');
 *   <Link to="/" onClick={handleLogoClick}>KeyClash</Link>
 *
 * (<LeaveRoomConfirmModal/> — mounted once near the root in App.tsx — is
 * what actually shows the dialog and calls navigate() on confirm.)
 */
export function useGuardedNav(to: string) {
  //const navigate = useNavigate();
  const currentRoom = useMultiplayerStore((s) => s.currentRoom);
  const requestNavigation = useMultiplayerStore((s) => s.requestNavigation);

  return useCallback(
    (e: React.MouseEvent) => {
      if (currentRoom) {
        e.preventDefault();
        requestNavigation(to);
      }
      // else: let the <Link>'s default navigation happen normally.
    },
    [currentRoom, requestNavigation, to],
  );
}
