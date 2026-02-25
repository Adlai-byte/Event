# Phase 7: Real-time & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace HTTP polling with Socket.io for real-time messaging and notifications, add skeleton loading screens for perceived performance, and add accessibility attributes to shared components.

**Architecture:** Socket.io server wraps the existing Express app. Client connects on auth, joins a user-specific room. Server emits events on message/notification creation; client uses those events to invalidate React Query caches (no data-flow changes, just the trigger mechanism). Skeleton screens replace `ActivityIndicator` spinners in key views. Accessibility added to all shared `ui/` and `layout/` components.

**Tech Stack:** Socket.io 4.x (server + client), React Native Reanimated (shimmer animation), existing @tanstack/react-query for cache invalidation

**Current State:**
- Messaging: HTTP polling at 2s (messages), 3s (conversations), 30s (AppLayout counts), 2s (NotificationDropdown)
- Loading: `ActivityIndicator` spinners everywhere, zero skeleton screens
- Accessibility: Zero `accessibilityLabel`/`accessibilityRole` usage across codebase
- Socket.io: Not installed, no WebSocket code exists

**Note:** No test framework is configured. Verification uses `npx tsc --noEmit` (type-check) and manual testing via `npm start`.

---

## Task 7.1: Install Socket.io Dependencies

**Files:**
- Modify: `server/package.json` (via npm install)
- Modify: `package.json` (via npm install)

**Step 1: Install server-side socket.io**

```bash
cd server && npm install socket.io
```

**Step 2: Install client-side socket.io-client**

```bash
cd .. && npm install socket.io-client
```

**Step 3: Verify installs**

```bash
node -e "require('socket.io'); console.log('socket.io OK')"
node -e "require('socket.io-client'); console.log('socket.io-client OK')"
```

**Step 4: Commit**

```bash
git add server/package.json server/package-lock.json package.json package-lock.json
git commit -m "chore: install socket.io and socket.io-client"
```

---

## Task 7.2: Create Socket.io Server

**Files:**
- Create: `server/socket.js`
- Modify: `server/index.js`

**Step 1: Create socket.js — event handler module**

```javascript
// server/socket.js
function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client sends 'join' with their user email after auth
    socket.on('join', (userEmail) => {
      if (!userEmail) return;
      socket.join(`user:${userEmail}`);
      console.log(`User ${userEmail} joined room user:${userEmail}`);
    });

    // Client joins a conversation room for live message updates
    socket.on('join-conversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    // Client leaves a conversation room
    socket.on('leave-conversation', (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocket };
```

**Step 2: Modify server/index.js — wrap Express with http.createServer, attach Socket.io**

Replace `app.listen(...)` at the bottom of `server/index.js` with:

```javascript
// At the top, add:
const http = require('http');
const { Server } = require('socket.io');
const { setupSocket } = require('./socket');

// ... (existing app setup code stays the same) ...

// Replace the app.listen block at the bottom:
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io available to route handlers
app.set('io', io);

setupSocket(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`API server listening on http://localhost:${PORT}`);
  console.log(`Socket.io attached on same port`);
  console.log(`For Android emulator: http://10.0.2.2:${PORT}`);
  console.log(`For physical devices: http://YOUR_IP:${PORT}`);
});
```

**Step 3: Type-check**

Run: `npx tsc --noEmit` from root — expect same pre-existing errors, no new ones.

**Step 4: Commit**

```bash
git add server/socket.js server/index.js
git commit -m "feat(server): add Socket.io server with room-based architecture

Wraps Express with http.createServer, attaches Socket.io.
Supports user rooms (user:{email}) and conversation rooms.
io instance available to routes via app.get('io')."
```

---

## Task 7.3: Emit Socket Events from Server Endpoints

**Files:**
- Modify: `server/routes/messaging.js`
- Modify: `server/routes/notifications.js`

**Step 1: Add socket emit to the send-message endpoint in messaging.js**

In `server/routes/messaging.js`, the `POST /conversations/:id/messages` handler (around line 247-383) already sends push notifications. After the message is created and the push notification logic, add socket emissions. Modify the route handler to accept `req.app.get('io')`:

After `return res.json({ ok: true, message: messageRows[0] });` (line 378), but before the return, add socket emissions:

```javascript
// After "// Send push notification" block and before the final return:

// Emit socket events for real-time updates
const io = req.app.get('io');
if (io) {
  // Notify conversation room (for live chat view)
  io.to(`conversation:${conversationId}`).emit('new-message', {
    conversationId: conversationId.toString(),
    message: messageRows[0],
  });

  // Notify the other user's personal room (for unread count badges)
  if (otherUserRows.length > 0) {
    io.to(`user:${otherUserRows[0].u_email}`).emit('unread-update');
    io.to(`user:${otherUserRows[0].u_email}`).emit('new-notification');
  }
}
```

Place this BEFORE the `return res.json(...)` line.

**Step 2: Add socket emit to the mark-as-read endpoint in messaging.js**

In the `POST /conversations/:id/read` handler, after the database updates succeed, emit:

```javascript
const io = req.app.get('io');
if (io) {
  io.to(`user:${userEmail}`).emit('unread-update');
}
```

**Step 3: Add socket emit when notifications are created**

In `server/routes/notifications.js`, the notification creation happens inline in messaging.js (line 347). For other notification creation points (booking status changes, hiring updates), those happen in `routes/bookings.js` and `routes/hiring.js`. For now, focus on the messaging path which is the highest-frequency case.

Add a helper at the top of `server/routes/messaging.js`:

```javascript
function emitNotification(req, userEmail) {
  const io = req.app.get('io');
  if (io && userEmail) {
    io.to(`user:${userEmail}`).emit('new-notification');
    io.to(`user:${userEmail}`).emit('unread-update');
  }
}
```

Use it after notification creation in the send-message handler.

**Step 4: Commit**

```bash
git add server/routes/messaging.js
git commit -m "feat(server): emit socket events on new messages and read receipts

Emits 'new-message' to conversation room for live chat.
Emits 'unread-update' and 'new-notification' to user rooms for badges."
```

---

## Task 7.4: Create Client Socket Service and Hook

**Files:**
- Create: `mvc/services/socketClient.ts`
- Create: `mvc/hooks/useSocket.ts`

**Step 1: Create socketClient.ts — singleton socket connection**

```typescript
// mvc/services/socketClient.ts
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(userEmail: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  const baseUrl = getApiBaseUrl();
  socket = io(baseUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    socket?.emit('join', userEmail);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('reconnect', () => {
    console.log('Socket reconnected, rejoining room');
    socket?.emit('join', userEmail);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

**Step 2: Create useSocket.ts — React hook for socket lifecycle**

```typescript
// mvc/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket, getSocket } from '../services/socketClient';

/**
 * Manages socket connection lifecycle tied to auth state.
 * Listens for server events and invalidates React Query caches.
 * Call this once in the root layout or auth-gated wrapper.
 */
export function useSocket(userEmail: string | undefined) {
  const queryClient = useQueryClient();
  const emailRef = useRef(userEmail);
  emailRef.current = userEmail;

  useEffect(() => {
    if (!userEmail) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(userEmail);

    // When server signals unread counts changed, invalidate relevant queries
    const onUnreadUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    };

    // When a new notification arrives
    const onNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    };

    socket.on('unread-update', onUnreadUpdate);
    socket.on('new-notification', onNewNotification);

    return () => {
      socket.off('unread-update', onUnreadUpdate);
      socket.off('new-notification', onNewNotification);
      disconnectSocket();
    };
  }, [userEmail, queryClient]);
}
```

**Step 3: Type-check**

Run: `npx tsc --noEmit` — expect no new errors.

**Step 4: Commit**

```bash
git add mvc/services/socketClient.ts mvc/hooks/useSocket.ts
git commit -m "feat(client): add socket client service and useSocket hook

Singleton socket connection with auto-reconnect.
useSocket hook invalidates React Query caches on server events."
```

---

## Task 7.5: Connect Socket in App Layout

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `mvc/components/layout/AppLayout.tsx`

**Step 1: Add useSocket to the root layout**

In `app/_layout.tsx`, import and call `useSocket` inside `RootLayout`:

```typescript
import { useSocket } from '../mvc/hooks/useSocket';
```

Inside the `RootLayout` component, after the existing `useEffect` for the focus manager, add:

```typescript
// Get user email from auth context for socket connection
const { authState } = useAuth();
useSocket(authState?.user?.email);
```

This connects/disconnects the socket based on auth state.

**Step 2: Replace polling in AppLayout.tsx with React Query**

Replace the `loadUnreadMessages` and `loadNotificationCount` manual fetch + setInterval pattern with `useQuery`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
```

Replace the manual state + fetch + interval with:

```typescript
const { data: unreadMessages = 0 } = useQuery({
  queryKey: ['unread-messages', user?.email],
  queryFn: async () => {
    const data = await apiClient.get('/api/user/messages/count', { email: user!.email });
    return data.ok ? (data.count || 0) : 0;
  },
  enabled: !!user?.email,
  refetchInterval: 60000, // Fallback polling at 60s (socket handles real-time)
});

const { data: notificationCount = 0 } = useQuery({
  queryKey: ['unread-notifications', user?.email],
  queryFn: async () => {
    const data = await apiClient.get('/api/notifications/unread-count', { email: user!.email });
    return data.ok ? (data.count || 0) : 0;
  },
  enabled: !!user?.email,
  refetchInterval: 60000,
});
```

Delete the `useState` for `unreadMessages` and `notificationCount`, the `loadUnreadMessages` callback, the `loadNotificationCount` callback, and the polling `useEffect`.

**Step 3: Type-check**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add app/_layout.tsx mvc/components/layout/AppLayout.tsx
git commit -m "feat: connect socket in root layout, replace AppLayout polling with React Query

Socket auto-connects on auth. AppLayout uses useQuery with 60s fallback
instead of 30s setInterval. Socket 'unread-update' events trigger instant
cache invalidation for real-time badge updates."
```

---

## Task 7.6: Replace Polling in MySQLMessagingService

**Files:**
- Modify: `mvc/services/MySQLMessagingService.ts`

**Step 1: Refactor subscribeToConversationMessages to use socket**

Replace the `setInterval` polling with socket event listeners. The service should join a conversation room when subscribing, listen for `new-message` events, and refetch messages when events arrive.

```typescript
// mvc/services/MySQLMessagingService.ts
import { getApiBaseUrl } from './api';
import { Message, Conversation } from '../models/Message';
import { getSocket } from './socketClient';

export class MySQLMessagingService {
  private static instance: MySQLMessagingService;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private socketCleanups: Map<string, () => void> = new Map();

  private constructor() {}

  static getInstance(): MySQLMessagingService {
    if (!MySQLMessagingService.instance) {
      MySQLMessagingService.instance = new MySQLMessagingService();
    }
    return MySQLMessagingService.instance;
  }

  // ... getUserConversations, getConversationMessages, sendMessage, markMessagesAsRead stay the same ...

  subscribeToConversationMessages(
    conversationId: string,
    userEmail: string,
    callback: (messages: Message[]) => void,
    interval: number = 2000
  ): () => void {
    // Clean up any existing subscription
    this.unsubscribeConversation(conversationId);

    // Load initial messages
    this.getConversationMessages(conversationId).then(callback);

    const socket = getSocket();
    if (socket?.connected) {
      // Socket-based: join conversation room and listen for new messages
      socket.emit('join-conversation', conversationId);

      const onNewMessage = (data: { conversationId: string }) => {
        if (data.conversationId === conversationId) {
          this.getConversationMessages(conversationId).then(callback);
        }
      };
      socket.on('new-message', onNewMessage);

      this.socketCleanups.set(conversationId, () => {
        socket.off('new-message', onNewMessage);
        socket.emit('leave-conversation', conversationId);
      });
    } else {
      // Fallback: polling when socket unavailable
      const intervalId = setInterval(async () => {
        const messages = await this.getConversationMessages(conversationId);
        callback(messages);
      }, interval);
      this.pollingIntervals.set(conversationId, intervalId);
    }

    return () => this.unsubscribeConversation(conversationId);
  }

  subscribeToUserConversations(
    userEmail: string,
    callback: (conversations: Conversation[]) => void,
    interval: number = 3000
  ): () => void {
    const key = `conversations_${userEmail}`;
    this.unsubscribeKey(key);

    // Load initial conversations
    this.getUserConversations(userEmail).then(callback);

    const socket = getSocket();
    if (socket?.connected) {
      // Socket-based: listen for unread updates which mean conversation list changed
      const onUnreadUpdate = () => {
        this.getUserConversations(userEmail).then(callback);
      };
      socket.on('unread-update', onUnreadUpdate);

      this.socketCleanups.set(key, () => {
        socket.off('unread-update', onUnreadUpdate);
      });
    } else {
      // Fallback: polling
      const intervalId = setInterval(async () => {
        const conversations = await this.getUserConversations(userEmail);
        callback(conversations);
      }, interval);
      this.pollingIntervals.set(key, intervalId);
    }

    return () => this.unsubscribeKey(key);
  }

  private unsubscribeConversation(conversationId: string): void {
    if (this.pollingIntervals.has(conversationId)) {
      clearInterval(this.pollingIntervals.get(conversationId)!);
      this.pollingIntervals.delete(conversationId);
    }
    if (this.socketCleanups.has(conversationId)) {
      this.socketCleanups.get(conversationId)!();
      this.socketCleanups.delete(conversationId);
    }
  }

  private unsubscribeKey(key: string): void {
    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key)!);
      this.pollingIntervals.delete(key);
    }
    if (this.socketCleanups.has(key)) {
      this.socketCleanups.get(key)!();
      this.socketCleanups.delete(key);
    }
  }

  cleanup(): void {
    this.pollingIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.pollingIntervals.clear();
    this.socketCleanups.forEach((cleanup) => cleanup());
    this.socketCleanups.clear();
  }
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add mvc/services/MySQLMessagingService.ts
git commit -m "feat(messaging): replace polling with socket events in MySQLMessagingService

Uses socket 'new-message' events for conversation messages.
Uses socket 'unread-update' events for conversation list.
Falls back to polling when socket is not connected."
```

---

## Task 7.7: Replace Polling in NotificationDropdown

**Files:**
- Modify: `mvc/components/NotificationDropdown.tsx`

**Step 1: Replace the 2-second polling interval with React Query + socket**

Replace the `loadNotifications` fetch + `setInterval` pattern with `useQuery`. The `useSocket` hook (Task 7.5) already invalidates `['notifications']` when `new-notification` events arrive.

In the `useEffect` that polls every 2s (lines 50-59), replace with:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
```

Replace the `useState` for `notifications` and `loading`, plus the polling `useEffect`, with:

```typescript
const { data: notifications = [], isLoading: loading } = useQuery({
  queryKey: ['notifications', userEmail],
  queryFn: async () => {
    const data = await apiClient.get('/api/notifications', { email: userEmail });
    return data.ok ? (data.notifications || []) : [];
  },
  enabled: isVisible && !!userEmail,
  refetchInterval: isVisible ? 30000 : false, // 30s fallback when visible
});
```

Remove the `loadNotifications` function and the polling `useEffect`.

**Step 2: Type-check**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add mvc/components/NotificationDropdown.tsx
git commit -m "refactor(notifications): replace 2s polling with React Query + socket

Notifications now fetched via useQuery. Socket 'new-notification' events
trigger instant cache invalidation. 30s fallback polling when visible."
```

---

## Task 7.8: Create Skeleton Loading Component

**Files:**
- Create: `mvc/components/ui/Skeleton.tsx`
- Modify: `mvc/components/ui/index.ts`

**Step 1: Create Skeleton component with shimmer animation**

```tsx
// mvc/components/ui/Skeleton.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius: radius = borderRadius.md,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Pre-composed skeleton for a card with title + 2 lines of text */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="60%" height={20} />
      <View style={styles.cardSpacer} />
      <Skeleton width="100%" height={14} />
      <View style={styles.cardSpacerSm} />
      <Skeleton width="80%" height={14} />
    </View>
  );
}

/** Pre-composed skeleton for a list item with avatar + text */
export function SkeletonListItem({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.listItem, style]}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.listItemText}>
        <Skeleton width="50%" height={16} />
        <View style={styles.cardSpacerSm} />
        <Skeleton width="70%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.neutral[200],
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: 16,
    marginBottom: 12,
  },
  cardSpacer: {
    height: 12,
  },
  cardSpacerSm: {
    height: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listItemText: {
    flex: 1,
    marginLeft: 12,
  },
});
```

**Step 2: Add to barrel export**

In `mvc/components/ui/index.ts`, add:

```typescript
export { Skeleton, SkeletonCard, SkeletonListItem } from './Skeleton';
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add mvc/components/ui/Skeleton.tsx mvc/components/ui/index.ts
git commit -m "feat(ui): add Skeleton component with shimmer animation

Base Skeleton + SkeletonCard and SkeletonListItem compositions.
Uses Animated API for cross-platform pulse effect."
```

---

## Task 7.9: Add Skeleton Screens to Key Views

**Files:**
- Modify: `mvc/components/dashboard/SearchResultsSection.tsx` (or the component showing loading spinner for dashboard)
- Modify: `mvc/components/services/ServiceCard.tsx` (or equivalent)
- Modify: `mvc/views/user/DashboardView.tsx`
- Modify: `mvc/views/provider/BookingsView.tsx`

**Step 1: Read each file to identify the current loading pattern**

Read the key view files to find where `ActivityIndicator` or `<Spinner>` is used for initial data loading. Replace the full-page spinner with skeleton compositions.

The typical pattern to replace:

```tsx
// Before:
if (loading) {
  return <ActivityIndicator size="large" color="#4a55e1" />;
}

// After:
if (loading) {
  return (
    <View style={{ padding: 16 }}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}
```

**Step 2: Replace loading spinners in DashboardView with SkeletonCards**

In the user DashboardView, replace the initial loading state (which shows a full-page spinner) with 3-4 `SkeletonCard` components to preview the content layout.

**Step 3: Replace loading in provider BookingsView with SkeletonListItems**

In the provider BookingsView, replace the loading state with `SkeletonListItem` components to preview the booking list.

**Step 4: Type-check**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add mvc/views/user/DashboardView.tsx mvc/views/provider/BookingsView.tsx
git commit -m "feat(views): replace loading spinners with skeleton screens

DashboardView and BookingsView now show content-aware skeletons
during initial load instead of generic spinners."
```

---

## Task 7.10: Accessibility Pass — Shared UI Components

**Files:**
- Modify: `mvc/components/ui/Badge.tsx`
- Modify: `mvc/components/ui/Card.tsx`
- Modify: `mvc/components/ui/Spinner.tsx`
- Modify: `mvc/components/ui/EmptyState.tsx`

**Step 1: Read each file and add missing accessibility attributes**

The `Button.tsx`, `Input.tsx`, and `Avatar.tsx` already have accessibility attributes from Phase 1. Add them to the remaining components:

**Badge.tsx** — add `accessibilityRole="text"` and `accessibilityLabel`:

```tsx
<View
  style={[styles.badge, { backgroundColor: v.bg }]}
  accessibilityRole="text"
  accessibilityLabel={label}
>
```

**Card.tsx** — add `accessible` and optional `accessibilityLabel`:

```tsx
interface CardProps {
  children: React.ReactNode;
  padding?: keyof typeof spacing;
  shadowLevel?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  accessibilityLabel?: string;
}
```

Pass it through to the `<View>`.

**Spinner.tsx** — add `accessibilityRole` and label:

```tsx
<View
  style={[styles.container, fullPage && styles.fullPage]}
  accessibilityRole="progressbar"
  accessibilityLabel={message || 'Loading'}
>
```

**EmptyState.tsx** — add `accessibilityRole` and label:

```tsx
<View style={styles.container} accessibilityRole="summary" accessibilityLabel={`${title}. ${description || ''}`}>
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add mvc/components/ui/Badge.tsx mvc/components/ui/Card.tsx mvc/components/ui/Spinner.tsx mvc/components/ui/EmptyState.tsx
git commit -m "feat(a11y): add accessibility attributes to shared UI components

Badge, Card, Spinner, EmptyState now have accessibilityRole and labels."
```

---

## Task 7.11: Accessibility Pass — Layout Components

**Files:**
- Modify: `mvc/components/layout/Sidebar.tsx`
- Modify: `mvc/components/layout/Header.tsx`
- Modify: `mvc/components/layout/BottomNav.tsx`
- Modify: `mvc/components/layout/AppLayout.tsx`

**Step 1: Read each layout file and verify/add accessibility**

The plan-defined versions of Sidebar, Header, and BottomNav already include `accessibilityRole`, `accessibilityLabel`, and `accessibilityState`. Read the actual files and verify these are present. If missing (may have been lost during implementation), add them:

**Sidebar.tsx:**
- Nav items: `accessibilityRole="button"`, `accessibilityLabel={item.label}`, `accessibilityState={{ selected: isActive }}`
- Logout button: `accessibilityLabel="Log out"`
- Close button: `accessibilityLabel="Close menu"`

**Header.tsx:**
- Menu button: `accessibilityLabel="Open menu"`
- Notification button: `accessibilityLabel="Notifications, N unread"`

**BottomNav.tsx:**
- Tabs: `accessibilityRole="tab"`, `accessibilityLabel={item.label}`, `accessibilityState={{ selected: isActive }}`

**AppLayout.tsx:**
- Drawer backdrop: `accessibilityLabel="Close menu"`

**Step 2: Type-check**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add mvc/components/layout/
git commit -m "feat(a11y): verify and add accessibility to layout components

Sidebar, Header, BottomNav, AppLayout all have proper roles and labels."
```

---

## Task 7.12: Final Verification

**Step 1: Run type-check**

```bash
npx tsc --noEmit
```

Expect: Same pre-existing errors only (AuthController, AuthState, Service, PushNotificationService, HiringController, NotificationSoundService). Zero new errors.

**Step 2: Verify socket.io server starts**

```bash
cd server && node -e "
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
server.listen(0, () => {
  console.log('Socket.io server OK on port', server.address().port);
  server.close();
});
"
```

**Step 3: Verify client import works**

```bash
node -e "
const { io } = require('socket.io-client');
console.log('socket.io-client import OK, io is:', typeof io);
"
```

**Step 4: Commit any remaining fixes**

If any verification steps fail, fix and commit.

---

## Dependency Graph

```
7.1 (install deps)
  └─► 7.2 (server socket setup)
       └─► 7.3 (server emit events)
       └─► 7.4 (client socket service + hook)
            └─► 7.5 (connect in AppLayout, replace polling)
            └─► 7.6 (replace MySQLMessagingService polling)
            └─► 7.7 (replace NotificationDropdown polling)

7.8 (Skeleton component)     ← independent of socket work
  └─► 7.9 (add skeletons to views)

7.10 (a11y UI components)    ← independent
7.11 (a11y layout components) ← independent

7.12 (final verification)    ← depends on all above
```

**Parallelizable groups:**
- After 7.4: Tasks 7.5, 7.6, 7.7 can run in parallel
- Tasks 7.8-7.9 are independent of 7.1-7.7
- Tasks 7.10-7.11 are independent of everything else

---

## Summary

| Task | What | Files | Lines saved / gained |
|------|------|-------|---------------------|
| 7.1 | Install socket.io | package.json (both) | +2 deps |
| 7.2 | Socket.io server | server/socket.js (new), server/index.js | ~30 lines new |
| 7.3 | Server emit events | server/routes/messaging.js | ~20 lines added |
| 7.4 | Client socket service + hook | socketClient.ts, useSocket.ts (new) | ~80 lines new |
| 7.5 | Connect socket, replace AppLayout polling | _layout.tsx, AppLayout.tsx | -30 lines polling, +15 lines query |
| 7.6 | Replace MySQLMessagingService polling | MySQLMessagingService.ts | Rewrite ~80 lines |
| 7.7 | Replace NotificationDropdown polling | NotificationDropdown.tsx | -15 lines polling, +10 lines query |
| 7.8 | Skeleton component | Skeleton.tsx (new) | ~120 lines new |
| 7.9 | Add skeletons to views | DashboardView, BookingsView | ~10 lines each |
| 7.10 | A11y shared UI components | Badge, Card, Spinner, EmptyState | ~10 lines total |
| 7.11 | A11y layout components | Sidebar, Header, BottomNav, AppLayout | ~15 lines total |
| 7.12 | Final verification | — | — |

**Net effect:** Polling eliminated from 4 locations (2s, 3s, 30s, 2s intervals → socket events + 60s fallback). Skeleton loading for 2 key views. Accessibility on all shared components.
