import { useEffect } from "react";
import { socket } from "@/socket";
import { useUser } from "@/contexts/UserContext";

/**
 * Custom hook to manage subscription to a user-specific socket room.
 * This is useful for features that require real-time updates related to a specific user,
 * for example, on a profile page or viewing their activities live.
 *
 * @param userId The ID of the user to subscribe to. If null, no action is taken.
 */
export const useSocketSubscription = (userId: string | null) => {
    const { user: currentUser } = useUser();

    useEffect(() => {
        // We only subscribe if there is a logged-in user, a target userId,
        // the socket is connected, and we are not viewing our own profile.
        // The main `register` event in UserContext already handles the user's own room.
        if (
            !currentUser ||
            !userId ||
            !socket.connected ||
            currentUser.id === userId
        ) {
            return;
        }

        console.log(`[Socket] Subscribing to updates for user: ${userId}`);
        socket.emit("join_user_room", userId);

        // Cleanup function to leave the room when the component unmounts
        // or when the userId changes.
        return () => {
            console.log(
                `[Socket] Unsubscribing from updates for user: ${userId}`
            );
            socket.emit("leave_user_room", userId);
        };
    }, [userId, currentUser?.id, socket.connected]); // Re-run when userId, currentUser, or socket connection status changes.
}; 