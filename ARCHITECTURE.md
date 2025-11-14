# StudyHub - Comprehensive Architecture Documentation

## Overview
A full-featured social learning platform built with React, TypeScript, Supabase, and Tailwind CSS. StudyHub enables students to form study groups, collaborate in real-time, share knowledge through posts, schedule live sessions, and build meaningful connections with peers.

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Feature Map](#feature-map)
4. [Component Hierarchy](#component-hierarchy)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Security Architecture](#security-architecture)
7. [Technology Stack](#technology-stack)
8. [Deployment](#deployment-architecture)

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              React Application (TypeScript)                 │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │  │
│  │  │   Auth UI    │  │  Main App    │  │   Themes     │     │  │
│  │  │   - Login    │  │  - Dashboard │  │  - Light     │     │  │
│  │  │   - Signup   │  │  - Groups    │  │  - Dark      │     │  │
│  │  │              │  │  - Posts     │  │              │     │  │
│  │  └──────────────┘  │  - Sessions  │  └──────────────┘     │  │
│  │                    │  - Messages  │                        │  │
│  │                    │  - Resources │                        │  │
│  │                    │  - Quizzes   │                        │  │
│  │                    │  - Friends   │                        │  │
│  │                    └──────────────┘                        │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │           State Management Layer                      │  │  │
│  │  │  - AuthContext (User Session)                        │  │  │
│  │  │  - ThemeContext (Dark/Light Mode)                    │  │  │
│  │  │  - Component State (React Hooks)                     │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                 ┌───────────┴───────────┐
                 │   Supabase Client     │
                 │   (@supabase/js)      │
                 └───────────┬───────────┘
                             │
┌────────────────────────────┴───────────────────────────────────────┐
│                        API/SERVICE LAYER                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│              ┌─────────────────────────────────┐                  │
│              │      SUPABASE PLATFORM          │                  │
│              │                                  │                  │
│              │  ┌────────────────────────────┐ │                  │
│              │  │   Authentication Service    │ │                  │
│              │  │   - Email/Password Auth    │ │                  │
│              │  │   - Session Management     │ │                  │
│              │  │   - JWT Tokens             │ │                  │
│              │  └────────────────────────────┘ │                  │
│              │                                  │                  │
│              │  ┌────────────────────────────┐ │                  │
│              │  │   PostgreSQL Database       │ │                  │
│              │  │   - 25+ Tables             │ │                  │
│              │  │   - Row Level Security     │ │                  │
│              │  │   - Triggers & Functions   │ │                  │
│              │  └────────────────────────────┘ │                  │
│              │                                  │                  │
│              │  ┌────────────────────────────┐ │                  │
│              │  │   Realtime Service          │ │                  │
│              │  │   - WebSocket Channels     │ │                  │
│              │  │   - Live Messaging         │ │                  │
│              │  │   - Comment Threads        │ │                  │
│              │  │   - Session Chat           │ │                  │
│              │  └────────────────────────────┘ │                  │
│              │                                  │                  │
│              └─────────────────────────────────┘                  │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Entities

#### User Management
```
profiles
├─ id (uuid, FK to auth.users)
├─ email (text)
├─ full_name (text)
├─ bio (text)
├─ avatar_url (text)
├─ created_at (timestamptz)
└─ updated_at (timestamptz)

user_connections
├─ id (uuid)
├─ requester_id (uuid, FK to profiles)
├─ recipient_id (uuid, FK to profiles)
├─ status (text: pending, accepted, rejected, blocked)
├─ created_at (timestamptz)
└─ updated_at (timestamptz)
```

#### Study Groups
```
study_groups
├─ id (uuid)
├─ name (text)
├─ description (text)
├─ subject (text)
├─ created_by (uuid, FK to profiles)
├─ is_public (boolean)
├─ max_members (integer)
├─ created_at (timestamptz)
└─ updated_at (timestamptz)

group_memberships
├─ id (uuid)
├─ group_id (uuid, FK to study_groups)
├─ user_id (uuid, FK to profiles)
├─ role (text: admin, moderator, member)
├─ invited_by (uuid, FK to profiles)
├─ can_invite (boolean)
├─ joined_at (timestamptz)
└─ last_active (timestamptz)

group_join_requests
├─ id (uuid)
├─ group_id (uuid, FK to study_groups)
├─ user_id (uuid, FK to profiles)
├─ status (text: pending, approved, rejected)
├─ message (text, nullable)
├─ reviewed_by (uuid, FK to profiles)
├─ created_at (timestamptz)
└─ updated_at (timestamptz)

group_invitations
├─ id (uuid)
├─ group_id (uuid, FK to study_groups)
├─ invited_by (uuid, FK to profiles)
├─ invited_user_id (uuid, FK to profiles)
├─ status (text: pending, accepted, rejected, expired)
├─ expires_at (timestamptz)
├─ created_at (timestamptz)
└─ updated_at (timestamptz)
```

#### Posts & Content
```
posts
├─ id (uuid)
├─ group_id (uuid, FK to study_groups)
├─ author_id (uuid, FK to profiles)
├─ title (text)
├─ content (text)
├─ post_type (text: question, discussion, article, solution, announcement)
├─ is_pinned (boolean)
├─ created_at (timestamptz)
├─ updated_at (timestamptz)
└─ edited_at (timestamptz, nullable)

post_reactions
├─ id (uuid)
├─ post_id (uuid, FK to posts)
├─ user_id (uuid, FK to profiles)
├─ reaction_type (text: like, helpful, insightful, love)
└─ created_at (timestamptz)

comments
├─ id (uuid)
├─ post_id (uuid, FK to posts)
├─ author_id (uuid, FK to profiles)
├─ content (text)
├─ parent_comment_id (uuid, FK to comments, nullable)
├─ created_at (timestamptz)
├─ updated_at (timestamptz)
└─ edited_at (timestamptz, nullable)

comment_reactions
├─ id (uuid)
├─ comment_id (uuid, FK to comments)
├─ user_id (uuid, FK to profiles)
├─ reaction_type (text: like, helpful)
└─ created_at (timestamptz)
```

#### Communication
```
messages (group chat)
├─ id (uuid)
├─ group_id (uuid, FK to study_groups)
├─ user_id (uuid, FK to profiles)
├─ content (text)
├─ message_type (text: text, file, system)
├─ reply_to (uuid, FK to messages, nullable)
├─ created_at (timestamptz)
└─ edited_at (timestamptz, nullable)

direct_messages
├─ id (uuid)
├─ sender_id (uuid, FK to profiles)
├─ recipient_id (uuid, FK to profiles)
├─ content (text)
├─ read (boolean)
├─ created_at (timestamptz)
└─ edited_at (timestamptz, nullable)

direct_message_reactions
├─ id (uuid)
├─ message_id (uuid, FK to direct_messages)
├─ user_id (uuid, FK to profiles)
├─ reaction_type (text: like, love, laugh, sad, angry)
└─ created_at (timestamptz)
```

#### Sessions
```
study_sessions
├─ id (uuid)
├─ group_id (uuid, FK to study_groups)
├─ title (text)
├─ description (text)
├─ scheduled_at (timestamptz)
├─ duration_minutes (integer)
├─ created_by (uuid, FK to profiles)
├─ status (text: scheduled, active, completed, cancelled)
├─ meeting_link (text, nullable)
├─ meeting_platform (text: zoom, google_meet, jitsi, other)
├─ meeting_password (text, nullable)
├─ max_participants (integer, nullable)
├─ materials_url (text, nullable)
├─ recording_url (text, nullable)
├─ notes (text, nullable)
└─ created_at (timestamptz)

session_participants
├─ id (uuid)
├─ session_id (uuid, FK to study_sessions)
├─ user_id (uuid, FK to profiles)
├─ joined_at (timestamptz)
├─ left_at (timestamptz, nullable)
└─ duration_minutes (integer)

session_materials
├─ id (uuid)
├─ session_id (uuid, FK to study_sessions)
├─ uploaded_by (uuid, FK to profiles)
├─ title (text)
├─ description (text, nullable)
├─ file_url (text, nullable)
├─ material_type (text: document, presentation, spreadsheet, link, video, other)
└─ created_at (timestamptz)

session_chat
├─ id (uuid)
├─ session_id (uuid, FK to study_sessions)
├─ user_id (uuid, FK to profiles)
├─ message (text)
├─ message_type (text: text, system, announcement)
└─ created_at (timestamptz)

session_polls
├─ id (uuid)
├─ session_id (uuid, FK to study_sessions)
├─ created_by (uuid, FK to profiles)
├─ question (text)
├─ options (jsonb)
├─ is_active (boolean)
├─ allow_multiple (boolean)
├─ created_at (timestamptz)
└─ ends_at (timestamptz, nullable)

session_poll_responses
├─ id (uuid)
├─ poll_id (uuid, FK to session_polls)
├─ user_id (uuid, FK to profiles)
├─ selected_options (jsonb)
└─ created_at (timestamptz)
```

#### Resources & Quizzes
```
resources
├─ id (uuid)
├─ group_id (uuid, FK to study_groups)
├─ uploaded_by (uuid, FK to profiles)
├─ title (text)
├─ description (text)
├─ file_url (text)
├─ file_type (text)
├─ file_size (integer)
└─ created_at (timestamptz)

quizzes
├─ id (uuid)
├─ group_id (uuid, FK to study_groups)
├─ created_by (uuid, FK to profiles)
├─ title (text)
├─ description (text)
├─ time_limit_minutes (integer, nullable)
├─ passing_score (number)
├─ is_active (boolean)
└─ created_at (timestamptz)

quiz_questions
├─ id (uuid)
├─ quiz_id (uuid, FK to quizzes)
├─ question_text (text)
├─ question_type (text: multiple_choice, true_false, short_answer)
├─ options (jsonb)
├─ correct_answer (text)
├─ points (number)
└─ order_index (integer)

quiz_attempts
├─ id (uuid)
├─ quiz_id (uuid, FK to quizzes)
├─ user_id (uuid, FK to profiles)
├─ score (number)
├─ total_points (number)
├─ answers (jsonb)
├─ started_at (timestamptz)
└─ completed_at (timestamptz, nullable)
```

#### Gamification
```
notifications
├─ id (uuid)
├─ user_id (uuid, FK to profiles)
├─ type (text)
├─ title (text)
├─ message (text)
├─ read (boolean)
├─ link (text, nullable)
└─ created_at (timestamptz)

user_streaks
├─ id (uuid)
├─ user_id (uuid, FK to profiles)
├─ current_streak (integer)
├─ longest_streak (integer)
├─ last_activity_date (date, nullable)
└─ updated_at (timestamptz)

achievements
├─ id (uuid)
├─ name (text)
├─ description (text)
├─ badge_icon (text)
├─ requirement_type (text)
├─ requirement_value (integer)
└─ created_at (timestamptz)

user_achievements
├─ id (uuid)
├─ user_id (uuid, FK to profiles)
├─ achievement_id (uuid, FK to achievements)
└─ earned_at (timestamptz)
```

---

## Feature Map

### User Features

#### Social & Connections
- **User Search**: Find other students by name or email
- **Friend Requests**: Send/receive connection requests
- **Friend Management**: Accept, reject, block connections
- **Direct Messaging**: Private 1-on-1 conversations with friends
- **Message Reactions**: React to direct messages
- **User Profiles**: View and edit personal profiles

#### Group Management
- **Create Groups**: Public or private study groups
- **Join Requests**: Request to join private groups
- **Invitations**: Admins can invite members
- **Member Roles**: Admin, moderator, member hierarchy
- **Group Discovery**: Browse and search public groups
- **Admin Controls**:
  - Promote/demote members
  - Remove members
  - Approve join requests
  - Delete any group content
  - Pin important posts
  - Edit group settings

#### Content Creation
- **Posts System**:
  - 5 post types (question, discussion, article, solution, announcement)
  - Rich text content with markdown support
  - Post reactions (like, helpful, insightful, love)
  - Threaded comments (up to 3 levels deep)
  - Comment reactions
  - Pin important posts
  - Edit/delete own content
  - Admins can moderate all content

- **Group Chat**:
  - Real-time messaging
  - Message threading
  - System messages

- **Resources**:
  - Upload and share files
  - Link sharing
  - Categorization by type

- **Quizzes**:
  - Multiple-choice questions
  - True/false questions
  - Short answer questions
  - Time limits
  - Attempt tracking
  - Score history

#### Sessions
- **Scheduling**: Create and manage study sessions
- **Meeting Integration**:
  - Support for Zoom, Google Meet, Jitsi
  - Store meeting links and passwords
  - Maximum participants limit
- **Session Features**:
  - Pre-session materials
  - Live text chat during session
  - Live polls and voting
  - Post-session recordings
  - Session notes and summaries
- **Participant Tracking**: Track attendance and duration

#### Gamification
- **Achievements**: Unlock badges for milestones
- **Study Streaks**: Daily activity tracking
- **Performance Analytics**: View study statistics
- **Leaderboards**: (Future enhancement)

### Admin-Specific Features
- Approve/reject join requests
- Invite new members
- Promote members to admin
- Remove members
- Delete any post, comment, or content
- Pin/unpin posts
- Modify group settings
- View member statistics

---

## Component Hierarchy

```
App
├── ThemeProvider (Context)
│   └── AuthProvider (Context)
│       │
│       ├── AuthPage (Unauthenticated)
│       │   ├── LoginForm
│       │   └── SignupForm
│       │
│       └── MainLayout (Authenticated)
│           ├── Header
│           │   ├── Logo
│           │   ├── Menu Toggle (Mobile)
│           │   ├── NotificationsDropdown
│           │   ├── Theme Toggle
│           │   └── User Menu
│           │
│           ├── Sidebar (Responsive)
│           │   └── Navigation Links
│           │       ├── Dashboard
│           │       ├── My Groups
│           │       ├── Posts
│           │       ├── Direct Messages
│           │       ├── Sessions
│           │       ├── Group Chat
│           │       ├── Resources
│           │       ├── Quizzes
│           │       ├── Achievements
│           │       ├── Connections
│           │       └── Profile
│           │
│           └── Content Area (Dynamic Routing)
│               │
│               ├── Dashboard
│               │   ├── Stats Overview
│               │   ├── Streak Card
│               │   ├── Recent Activity
│               │   └── Quick Actions
│               │
│               ├── GroupsList
│               │   ├── My Groups Tab
│               │   ├── Discover Tab
│               │   ├── Search & Filter
│               │   ├── GroupCard (multiple)
│               │   ├── CreateGroupModal
│               │   └── GroupDetailModal
│               │       ├── Overview
│               │       ├── Stats Cards (clickable)
│               │       └── Members Management
│               │
│               ├── PostsPage
│               │   ├── Create Post Button
│               │   ├── Group Filter
│               │   ├── Type Filter
│               │   ├── Search Bar
│               │   ├── PostCard (multiple)
│               │   ├── CreatePostModal
│               │   └── PostDetailView
│               │       ├── Post Content
│               │       ├── Reactions
│               │       ├── Comments Thread
│               │       └── Reply System
│               │
│               ├── ConnectionsPage
│               │   ├── Connections Tab
│               │   │   ├── Connected Users List
│               │   │   └── Remove Connection
│               │   ├── Requests Tab
│               │   │   ├── Pending Requests
│               │   │   └── Accept/Reject Actions
│               │   └── Find Friends Tab
│               │       ├── User Search
│               │       └── Send Connection Request
│               │
│               ├── DirectMessagesPage
│               │   ├── Conversations List
│               │   ├── Chat View
│               │   ├── Message Reactions
│               │   └── Real-time Updates
│               │
│               ├── SessionsList
│               │   ├── List/Calendar Toggle
│               │   ├── Session Cards
│               │   ├── CreateSessionModal (with Meeting Integration)
│               │   └── SessionDetailView
│               │       ├── Meeting Info (Link, Platform, Password)
│               │       ├── Materials
│               │       ├── Live Chat
│               │       ├── Polls
│               │       └── Participants
│               │
│               ├── MessagesList
│               │   ├── Conversations List
│               │   ├── Chat View
│               │   └── Message Input
│               │
│               ├── ResourcesList
│               │   ├── Filter by Group
│               │   ├── Resource Cards
│               │   └── UploadResourceModal
│               │
│               ├── QuizzesList
│               │   ├── Available Quizzes
│               │   ├── CreateQuizModal
│               │   ├── TakeQuizModal
│               │   └── Results View
│               │
│               ├── AchievementsPage
│               │   ├── Progress Overview
│               │   └── Achievement Grid
│               │
│               └── ProfilePage
│                   ├── Avatar & Info
│                   ├── Edit Profile
│                   ├── Study Stats
│                   └── Connections
```

---

## Data Flow Patterns

### Real-Time Updates

#### Post Comments Flow
```
User A posts comment
     │
     ↓
supabase.from('comments').insert()
     │
     ↓
PostgreSQL Database
     │
     ↓
Realtime Channel Broadcast
     │
     ├────► User A (updates UI)
     ├────► User B (new comment)
     └────► User C (new comment)
```

#### Live Session Chat
```
User sends message
     │
     ↓
session_chat table
     │
     ↓
WebSocket broadcast
     │
     └────► All session participants
```

### Authorization Flow

```
1. User authenticates
   ↓
2. JWT token issued
   ↓
3. Token included in all requests
   ↓
4. RLS policies check permissions
   ↓
5. Return authorized data only
```

### Group Join Flow

#### Public Groups
```
User clicks "Join"
     │
     ↓
Insert into group_join_requests
     │
     ↓
Trigger auto-approves (is_public = true)
     │
     ↓
Insert into group_memberships
     │
     ↓
User is now a member
```

#### Private Groups
```
User clicks "Request to Join"
     │
     ↓
Insert into group_join_requests (status = pending)
     │
     ↓
Admin receives notification
     │
     ↓
Admin approves/rejects
     │
     ↓
If approved: trigger adds to group_memberships
```

---

## Security Architecture

### Multi-Layer Security

#### Layer 1: Authentication
- Email/password with secure hashing
- JWT token with expiration
- Session management
- Secure cookie storage

#### Layer 2: Authorization (RLS Policies)
- **Groups**: Users can only view groups they're members of
- **Posts**: Only group members can view/create posts
- **Messages**: Only sender/recipient can view DMs
- **Sessions**: Only group members can access session features
- **Admin Actions**: Only admins can moderate content

#### Layer 3: Data Validation
- TypeScript type safety
- Client-side form validation
- Server-side constraints
- SQL injection prevention (parameterized queries)

#### Layer 4: Privacy
- Encrypted connections (HTTPS/WSS)
- No sensitive data in URLs
- Group-scoped data access
- User connection privacy

### Key RLS Policies

```sql
-- Users can only view their connections
CREATE POLICY "Users can view own connections"
ON user_connections FOR SELECT
TO authenticated
USING (requester_id = auth.uid() OR recipient_id = auth.uid());

-- Only group members can view posts
CREATE POLICY "Group members can view posts"
ON posts FOR SELECT
TO authenticated
USING (is_group_member(group_id, auth.uid()));

-- Admins can delete any group content
CREATE POLICY "Admins can delete posts"
ON posts FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR is_group_admin(group_id, auth.uid())
);
```

---

## Technology Stack

### Frontend
- **Framework**: React 18.3
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Build Tool**: Vite 5.4
- **State**: React Context API + Hooks

### Backend & Services
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Realtime**: Supabase Realtime
- **API**: Supabase Auto-generated REST API
- **Storage**: Supabase Storage (for future file uploads)

### Development
- **Linting**: ESLint 9
- **Type Checking**: TypeScript strict mode
- **Version Control**: Git

---

## Deployment Architecture

```
┌────────────────────┐
│   Static Hosting   │  ← React SPA (Vite build)
│  (Netlify/Vercel)  │
└──────────┬─────────┘
           │ HTTPS
           │
┌──────────▼─────────┐
│   React Client     │
└──────────┬─────────┘
           │ API Calls (HTTPS/WSS)
           │
┌──────────▼────────────────────┐
│    Supabase Cloud Platform    │
│                                │
│  ┌──────────────────────────┐ │
│  │  PostgreSQL (25+ tables) │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │  Auth Service (JWT)      │ │
│  └──────────────────────────┘ │
│                                │
│  ┌──────────────────────────┐ │
│  │  Realtime (WebSockets)   │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

---

## Performance Optimizations

1. **Database**
   - Indexed foreign keys
   - Composite indexes on frequently queried columns
   - Efficient RLS policies using helper functions

2. **Queries**
   - Use `maybeSingle()` for optional rows
   - Parallel queries with `Promise.all()`
   - Limit result sets
   - Select only needed columns

3. **Real-time**
   - Subscribe only to relevant channels
   - Unsubscribe on component unmount
   - Batch updates

4. **Frontend**
   - Code splitting (Vite)
   - Lazy loading components
   - Debounced search inputs
   - Optimistic UI updates
   - Mobile-responsive design

---

## Future Enhancements

### Short-term
- File upload support (avatars, attachments)
- Email notifications
- User presence indicators
- Typing indicators
- Read receipts

### Medium-term
- Video chat integration (WebRTC or third-party)
- Screen sharing in sessions
- Whiteboard for live sessions
- Mobile app (React Native)
- Push notifications

### Long-term
- AI study recommendations
- Automated quiz generation
- Spaced repetition flashcards
- Study time tracking
- LMS integration
- Export/import data
- Analytics dashboard
- Certificates

---

## Success Metrics

### User Engagement
- Daily/monthly active users
- Average session duration
- Posts per user per week
- Messages sent per day

### Feature Adoption
- Groups created
- Sessions scheduled
- Posts published
- Connections made

### Performance
- Page load time < 2s
- Message latency < 100ms
- 99.9% uptime

---

## Conclusion

StudyHub is a comprehensive social learning platform that combines real-time collaboration, knowledge sharing through posts, scheduled study sessions, and social connections. Built with modern technologies and security best practices, it provides students with a complete ecosystem for collaborative learning.

**Key Strengths:**
- Complete social features (friends, DMs, profiles)
- Rich content system (posts with comments and reactions)
- Group management with admin controls
- Live session support with polls and chat
- Real-time everything (messages, comments, updates)
- Scalable architecture
- Mobile-responsive design
- Dark mode support
- Production-ready with comprehensive RLS

**Current Status:** Production-ready with all Phase 1-3 features implemented and tested.
