# OutWork

**OutWork** is a mobile app for discovering and reviewing remote-work-friendly venues — cafes, co-working spaces, libraries, and more. Users can explore spots on a map, check real-time crowd levels, write reviews, and earn XP and badges through a gamification system.

This is an [Expo](https://expo.dev) project built with React Native, targeting iOS and Android.

[Download on iOS](https://apps.apple.com/us/app/outwork-your-workspace-app/id6759715313)

---

## Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo (React Native) with Expo Router (file-based routing) |
| Language | TypeScript (strict) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Maps | `react-native-maps` with Apple Maps (default provider) |
| Animations | `react-native-reanimated` + `react-native-gesture-handler` |
| Images | `expo-image` (optimized caching) |
| Auth storage | `expo-secure-store` (native) |

---

### Directory Structure

```
/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout — wraps everything in ThemeProvider, AuthProvider, FavoritesProvider
│   ├── index.tsx                 # Entry redirect
│   ├── (tabs)/                   # Main tab navigator (auth-gated)
│   │   ├── _layout.tsx           # Tab bar config, auth guard (redirects to signin if no session)
│   │   ├── index.tsx             # Map/Explore — fullscreen map with bottom sheet and cluster markers
│   │   ├── home.tsx              # Home — ranked card feed of places
│   │   ├── favorites.tsx         # Saved/favorited places list
│   │   ├── explore.tsx           # Post — form to submit a new workspace
│   │   ├── passport.tsx          # Gamification hub: XP, rank, badges, passport stamps, leaderboard
│   │   └── settings.tsx          # Profile & account settings
│   ├── auth/                     # Auth screens (unauthenticated)
│   │   ├── signin.tsx
│   │   ├── signup.tsx
│   │   ├── reset-password.tsx
│   │   └── callback.tsx          # OAuth redirect handler
│   ├── place/
│   │   └── [id].tsx              # Dynamic place detail screen
│   ├── components/               # Screen-level components
│   │   ├── AirbnbBottomSheet.tsx # Draggable 3-state sheet (collapsed/half/full)
│   │   ├── ClusterMarker.tsx     # Map cluster bubble
│   │   ├── CrowdLevelModal.tsx   # Crowd report submission modal
│   │   ├── FilterModal.tsx       # Category/filter picker
│   │   ├── FloatingCard.tsx      # Preview card that slides up on map pin tap
│   │   ├── MapHeader.tsx         # Search bar + category chips pinned at top of map
│   │   ├── MapMarker.tsx         # Custom map pin showing rating
│   │   ├── PlaceDetailed.tsx     # Full place detail view (images, reviews, crowd stats)
│   │   ├── ReviewForm.tsx        # Star-rating + sub-rating review form
│   │   ├── ReviewsList.tsx       # Paginated reviews list
│   │   ├── ListingCard.tsx       # Compact place card
│   │   ├── ListingCardDetailed.tsx
│   │   ├── ListingRow.tsx        # Horizontal scrollable place row
│   │   ├── ImageCarousel.tsx
│   │   └── gamification/        # Gamification UI overlays
│   │       ├── BadgeAwardedSheet.tsx
│   │       ├── BadgeDetailSheet.tsx
│   │       ├── RankUpModal.tsx
│   │       └── XpToast.tsx
│   ├── feedback.tsx
│   ├── help.tsx
│   ├── modal.tsx
│   └── report-nsfw.tsx
│
├── components/                   # Shared primitive UI components
│   └── ui/                       # Auth container, inputs, gallery, gradient button, icon symbols
│
├── context/                      # Global React context providers
│   ├── AuthContext.tsx           # Session state + signOut; listens to supabase.auth.onAuthStateChange
│   ├── FavoritesContext.tsx      # Favorites list with local + remote sync
│   └── ThemeContext.tsx          # Light/dark mode
│
├── hooks/
│   ├── useClusters.ts            # Geo-clustering logic for map markers (supercluster)
│   └── use-color-scheme.ts       # Respects system preference + ThemeContext override
│
├── services/                     # All Supabase data access (no business logic in screens)
│   ├── places.ts                 # CRUD for places; supports category filter + text search
│   ├── reviews.ts                # Review CRUD
│   ├── crowd.ts                  # Crowd reports: insert + aggregate by ±2-hour window
│   ├── favorites.ts              # User favorites persistence
│   ├── gamification.ts           # XP grants, badge checks, passport stamps, leaderboard
│   ├── images.ts                 # Image upload to Supabase Storage
│   ├── categories.ts             # Workspace category lookup
│   ├── places_categories.ts      # Many-to-many place↔category
│   ├── profiles.ts               # User profile read/update
│   └── users.ts                  # Auth user helpers
│
├── lib/
│   ├── supabase.ts               # Supabase client (SecureStore adapter on native, cookie on web)
│   ├── auth/social.ts            # Google/Apple OAuth helpers
│   ├── date.ts                   # Date formatting utilities
│   └── imagePicker.ts            # Expo ImagePicker wrapper
│
├── utils/
│   ├── workingHours.ts           # Open/closed status calculation from working_hours JSON
│   ├── location.ts               # Geolocation helpers
│   └── transitions.ts            # Shared animation presets
│
├── constants/
│   └── theme.ts                  # Brand colours, category list, shared style tokens
│
├── supabase/
│   └── functions/
│       └── delete-account/       # Deno Edge Function — deletes auth user via service-role key
│
└── .eas/workflows/               # EAS CI/CD workflow definitions (preview, build, deploy)
```

---

### Data Flow

```
Screen / Component
      │
      ▼
  services/*          ← thin async functions, call supabase directly
      │
      ▼
  lib/supabase.ts     ← single shared Supabase client
      │
      ▼
  Supabase (Postgres + Auth + Storage)
```

Context providers (`AuthContext`, `FavoritesContext`) sit between the root layout and all screens, providing global state without prop-drilling. Individual screens call `services/*` directly for data fetching — there is no intermediate state management library (no Redux/Zustand).

---

### Key Screens

**Map screen (`(tabs)/index.tsx`)** — The primary discovery surface. Renders a fullscreen `MapView` with custom `MapMarker` pins (show rating) and `ClusterMarker` bubbles for dense areas. A `MapHeader` floats at the top with a search input and horizontally-scrollable category chips. An Airbnb-style draggable bottom sheet (collapsed / half / full) contains a carousel of place cards. Tapping a pin hides the sheet and shows a `FloatingCard` preview; tapping the card navigates to the place detail screen.

**Passport screen (`(tabs)/passport.tsx`)** — Gamification hub. Displays the user's current rank (with animated rank badge), XP progress bar, earned badges grid, passport stamp map, and a weekly leaderboard.

**Place detail (`place/[id].tsx`)** — Full detail view with image carousel, open/closed status from working hours, crowd level indicator (with hourly bar chart), star rating breakdown, reviews list, and a crowd report submission modal.

---

### Gamification System

Defined in `services/gamification.ts`:

| Action | XP |
|---|---|
| Write a review | +50 |
| Review with all sub-ratings filled | +20 |
| First ever review of a place | +30 |
| Submit a crowd report | +15 |
| Add a new place | +100 |

**Ranks** (6 levels): Desk Lurker → Coffee Scout → WiFi Wanderer → Office Nomad → WorkNomad Pro → Workspace Legend.

**Badges** are checked after every XP-granting action and inserted into `user_badges` when conditions are met (e.g. 10 crowd reports = "Crowd Whisperer", first review = "First Steps"). Neighborhood-completion badges are generated dynamically based on stamping every approved place in a city neighborhood.

**Passport stamps** are issued when a user submits a review for a place they haven't reviewed before, creating a geographic "visited" log displayed on the Passport screen.

---

### Authentication

- Email/password sign-up and sign-in via Supabase Auth
- Google, Apple and Github OAuth (`lib/auth/social.ts`)
- Session token persisted in `expo-secure-store` on native, browser cookies on web
- `AuthContext` subscribes to `onAuthStateChange` and drives the tab navigator's auth guard
- Account deletion handled by a Supabase Deno Edge Function (`delete-account`) using the service-role key so the user's auth record is fully removed

---

### Crowd Level System

Users submit reports via `services/crowd.ts` with `{ place_id, day_of_week, time_bucket, crowd_level }`. The current crowd level for a place is computed as the mode of all reports within a ±2-hour window for the current day and hour. Confidence is "high" when ≥ 10 reports exist, "low" otherwise. A separate hourly bar chart query shows typical busy times for the current day of the week.

---

## Get started

To start the app, in your terminal run:

```bash
npm run start
```

In the output, you'll find options to open the app in:

- [a development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [an Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [an iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Workflows

This project is configured to use [EAS Workflows](https://docs.expo.dev/eas/workflows/get-started/) to automate some development and release processes. These commands are set up in [`package.json`](./package.json) and can be run using NPM scripts in your terminal.

### Previews

Run `npm run draft` to [publish a preview update](https://docs.expo.dev/eas/workflows/examples/publish-preview-update/) of your project, which can be viewed in Expo Go or in a development build.

### Development Builds

Run `npm run development-builds` to [create a development build](https://docs.expo.dev/eas/workflows/examples/create-development-builds/). Note - you'll need to follow the [Prerequisites](https://docs.expo.dev/eas/workflows/examples/create-development-builds/#prerequisites) to ensure you have the correct emulator setup on your machine.

### Production Deployments

Run `npm run deploy` to [deploy to production](https://docs.expo.dev/eas/workflows/examples/deploy-to-production/). Note - you'll need to follow the [Prerequisites](https://docs.expo.dev/eas/workflows/examples/deploy-to-production/#prerequisites) to ensure you're set up to submit to the Apple and Google stores.

## Hosting

Expo offers hosting for websites and API functions via EAS Hosting. See the [Getting Started](https://docs.expo.dev/eas/hosting/get-started/) guide to learn more.


## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
