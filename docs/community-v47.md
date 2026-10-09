# Community v47 — friends, direct messages and voice beta

## Architecture
- Existing group channels and questions/progress remain intact.
- Public directory: `profiles` (member display names only).
- `social_friendships`: pending and accepted request status, participants-only RLS, server-only write RPCs.
- `chat_groups.kind='direct'`: exactly two ordered UUID participants, unique room per pair.
- Group and direct messages share existing `chat_messages`, `chat_message_reactions`, `chat_reads`, `chat-files` and the realtime notification layer.
- Private images are downloaded only with the logged-in user's bearer token, checked by Supabase Storage RLS and displayed as transient object URLs. SVG and other active image formats do not render as inline previews.
- Server RPCs: `create_study_group`, `request_friend`, `respond_friend`, `remove_friend`, `start_direct_chat`.
- Voice beta uses WebRTC audio; `chat_calls` and `chat_call_signals` store signaling only. Incoming calls are polled with Realtime acceleration. WebRTC requires HTTPS, microphone permission and connectivity between both peers.

## Database
Supabase project `uangiwgznukuicrfnohq` has had migrations applied through the Supabase management connection:
- `social_friends_and_direct_chat_v47`
- `direct_voice_calls_beta_v47`
- `grant_voice_call_rls_helper_v47`
- `safe_voice_start_rpc_v47`

All tables with user data have RLS, authenticated roles are limited to expected operations, and direct rooms cannot be renamed into public groups or have unauthorized participants inserted. The former browser-side group insertion has been replaced with an authorization-checked RPC.

## Limits and next hardening
- WebRTC beta uses a free public STUN endpoint only: there is no TURN relay, so calls on symmetric NAT / strict campus firewalls may fail. This is not a production-reliable voice service.
- Incoming ringing works while the Community page is open; there are no push notifications for a closed browser.
- Audio is not recorded/stored. SDP/ICE metadata are stored in Supabase; do not treat it as end-to-end encrypted signaling.
- Apply rate limits, contact blocking/reporting and scheduled cleanup for old signaling records before expanding beyond a small trusted LMS cohort.
- For multi-device reliability use a TURN provider and consider message delivery status.
- Existing group/file limits apply to direct conversations.
