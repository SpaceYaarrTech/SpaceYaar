You are not only the lead frontend engineer for SpaceYar; you are also the product designer, UI/UX designer, interaction designer, and visual design director for this project.

Treat SpaceYar as a serious startup product that will eventually become a large-scale platform. Every decision made now should establish a strong visual and technical foundation for the rest of the application.

Do not create a generic AI-generated website.

Think like an experienced product designer at a premium consumer-tech startup.

⸻

1. PRODUCT

Product name:

SpaceYar

SpaceYar will eventually connect:

* Property owners
* Renters

The platform will eventually include property discovery, listings, profiles, authentication, dashboards, messaging, payments and other functionality.

For this task, however, implement ONLY:

1. Splash screen
2. Owner onboarding
3. Renter onboarding
4. Login screen

Do not implement future marketplace functionality yet.

⸻

2. DESIGN DIRECTION

The primary visual identity of SpaceYar is:

WHITE + RED

This must be treated as the core brand system throughout the application.

The interface should feel:

* Premium
* Modern
* Clean
* Confident
* Trustworthy
* Young
* Energetic
* Minimal
* Sophisticated
* Technology-driven

The design should communicate both:

Real estate + modern technology

Do not make it look like a traditional real-estate website.

Do not make it look like a generic SaaS dashboard.

Do not overuse cards.

Do not overuse gradients.

Do not use excessive glassmorphism.

Do not use random colors simply to make the UI “interesting.”

The visual identity should be strongly recognizable as SpaceYar.

⸻

3. COLOR SYSTEM

Create a centralized SpaceYar color system.

Primary:

SpaceYar Red

Use a strong, premium red as the primary brand color.

Suggested starting value:

#E53935

However, treat this as a design token rather than scattering the hex value throughout the code.

Create semantic tokens such as:

* --color-brand
* --color-brand-dark
* --color-brand-light
* --color-background
* --color-surface
* --color-text-primary
* --color-text-secondary
* --color-border

Use:

* White as the dominant background
* Red for primary actions and brand emphasis
* Near-black/dark charcoal for primary text
* Soft neutral greys for secondary text and borders
* Very subtle red-tinted backgrounds where appropriate

Avoid using pure red everywhere.

Red should create emphasis and visual hierarchy.

The application should remain predominantly white.

A useful approximate visual balance is:

70–80% white / neutral space
15–20% dark text and neutral elements
5–10% red brand accents

Do not treat this as a rigid mathematical rule; use it as a design direction.

⸻

4. BRAND CONSISTENCY

Create a reusable design language that future SpaceYar screens can inherit.

Define consistent:

* Colors
* Typography
* Spacing
* Border radii
* Buttons
* Inputs
* Shadows
* Icon treatment
* Animation timing
* Hover behavior
* Focus states
* Transitions

Do not design each screen independently.

The splash screen, onboarding screens and login screen must clearly feel like parts of the same product.

If I later ask you to build:

* Home
* Search
* Property details
* Owner dashboard
* Renter dashboard
* Profile
* Messaging

they should naturally inherit this same visual system.

⸻

5. TECHNOLOGY

Use:

* Next.js
* React
* TypeScript
* Next.js App Router
* Tailwind CSS
* Motion for React
* ESLint

Motion should be imported using its current React API.

Use:

motion/react

Motion is specifically intended for production React animations and supports gestures, transitions, layout animation and reduced-motion handling.

Do not introduce unnecessary animation libraries.

⸻

6. FIRST: INSPECT THE REPOSITORY

Before writing code:

1. Inspect the existing repository.
2. Inspect package.json.
3. Inspect the current Next.js configuration.
4. Inspect the app directory.
5. Inspect existing components.
6. Inspect existing styles.
7. Inspect assets.
8. Determine whether Tailwind is already configured.
9. Determine whether TypeScript is already configured.

Do not destroy existing work.

Do not initialize another Next.js project inside the repository.

Reuse compatible existing architecture.

If the repository is essentially empty/boilerplate, establish the architecture described here.

⸻

7. DESIGNER-FIRST APPROACH

Before implementing the screens, think through the visual composition.

For every screen ask:

* What should the user notice first?
* Where should the eye travel?
* What is the primary action?
* Where should red be used?
* Where should whitespace dominate?
* How does the composition change between mobile and desktop?
* How should the animation reinforce the brand?
* Does the screen feel like SpaceYar?

Do not simply place text, buttons and images into a centered column.

Use composition intentionally.

The application should have strong visual rhythm.

⸻

8. SPLASH SCREEN

Create a premium SpaceYar splash experience.

The splash screen should be predominantly white.

Use the SpaceYar red identity as an accent.

The SpaceYar logo/wordmark should be the visual focal point.

Animation concept:

1. Start with a clean white screen.
2. Introduce a subtle red visual element.
3. Animate the SpaceYar logo/wordmark into view.
4. Use a refined scale + opacity + slight movement transition.
5. Add a subtle secondary motion effect around the branding.
6. Let the logo settle naturally.
7. Transition smoothly into onboarding.

The animation should feel:

Premium, modern and confident.

Avoid:

* Excessive bouncing
* Cartoon-style animation
* Huge rotations
* Overly complicated 3D effects
* Long intro sequences

The user should feel that they are entering a polished product.

Use Motion for React.

Respect:

prefers-reduced-motion

Users who have reduced motion enabled should receive a simple fade/opacity transition.

The splash should automatically transition after a short period.

Do not make the user manually dismiss the splash screen.

⸻

9. ONBOARDING STRUCTURE

Create one reusable

Slide 1:

OWNER

Slide 2:

RENTER

The slides should feel visually related but should have their own personality.

Do not make them identical except for the text.

⸻

10. OWNER SCREEN

Purpose:

Introduce SpaceYar from a property owner’s perspective.

Headline:

List. Connect. Earn.

Supporting copy:

Turn your space into an opportunity. Find the right people and manage your property with ease.

Visual direction:

Use a premium property-related visual.

The composition should combine:

* Large property imagery
* White space
* Red brand accents
* Elegant typography
* Subtle UI overlays or decorative elements where appropriate

Do not overcrowd the screen.

The image should feel aspirational but believable.

⸻

11. RENTER SCREEN

Purpose:

Introduce SpaceYar from a renter’s perspective.

Headline:

Find your next space.

Supporting copy:

Discover places that fit your lifestyle, budget and needs — all in one place.

Use a different property/lifestyle visual from the owner screen.

Maintain the same SpaceYar design language.

The renter screen should feel slightly more discovery/lifestyle oriented.

⸻

12. IMAGE TREATMENT

Images are an important part of the design.

Do not simply place rectangular images on the page.

Explore polished compositions such as:

* Rounded image containers
* Cropped editorial images
* Layered imagery
* Subtle red accents
* Floating visual elements
* Soft shadows
* Slight parallax
* Masked/rounded shapes

However, keep the design restrained.

The objective is:

premium startup design

not:

visual effects showcase

Use replaceable image assets.

Do not hard-code an architecture that makes replacing production assets difficult later.

⸻

13. ONBOARDING ANIMATION

Use Motion for React to create a sophisticated carousel.

When changing slides:

* Previous content should exit smoothly.
* New content should enter smoothly.
* Images should have their own transition.
* Headline should animate independently.
* Supporting copy should animate subtly.
* CTA should follow naturally.
* Indicators should animate.

Consider using:

* opacity
* translateX
* scale
* subtle blur
* spring transitions
* staggered text animation

Do not animate every element aggressively.

The animation should establish a visual hierarchy.

For example:

IMAGE
↓
HEADLINE
↓
DESCRIPTION
↓
CTA
↓
INDICATOR

The user should naturally understand the content during the transition.

⸻

14. AUTO-PLAY

The onboarding carousel should automatically move between slides.

Use approximately:

4–6 seconds per slide.

When the user interacts manually:

* Reset the timer.
* Prevent conflicting transitions.
* Prevent multiple timers.
* Clean up timers on unmount.

The user should always feel in control.

⸻

15. SWIPE INTERACTION

On mobile, users should be able to swipe horizontally between onboarding slides.

Use Motion’s gesture capabilities.

The gesture should feel natural.

A left swipe should move toward the next slide.

A right swipe should move toward the previous slide.

Do not make the swipe overly sensitive.

Make sure vertical page scrolling is not accidentally blocked.

⸻

16. DOT INDICATOR

Create a two-dot pagination indicator.

Place it toward the lower-right area of the onboarding experience, while maintaining appropriate spacing from the screen edges.

Example:

● ○

and:

○ ●

The active indicator should use SpaceYar red.

The inactive indicator should use a subtle neutral tone.

Animate the indicator when the slide changes.

Do not simply instantly switch colors.

The indicator should feel integrated into the overall composition.

⸻

17. DESKTOP ONBOARDING

On desktop, do NOT simply scale the mobile interface.

Create a deliberate desktop composition.

Consider a layout such as:

LEFT:
Branding + text + CTA

RIGHT:
Large editorial property image / visual composition

or another equally strong composition if your design judgment produces something better.

The exact layout is up to you.

You are expected to make a design decision rather than blindly follow this example.

Use the white/red identity consistently.

The page should make good use of wide screens without stretching content unnecessarily.

⸻

18. MOBILE ONBOARDING

On mobile:

* Prioritize the image and headline.
* Keep the CTA easily reachable.
* Maintain comfortable margins.
* Avoid content being hidden behind browser UI.
* Avoid horizontal scrolling.
* Keep typography readable.
* Make touch targets sufficiently large.

The mobile version should feel intentionally designed, not like a compressed desktop page.

⸻

19. RESPONSIVE BREAKPOINTS

Support:

Mobile:
320px–480px

Tablet:
768px–1024px

Desktop:
1280px+

Also ensure the layout behaves reasonably between these ranges.

Test unusual viewport dimensions.

Do not assume only one iPhone size.

⸻

20. LOGIN SCREEN

After onboarding, navigate to:

/login

The login screen must clearly belong to the same SpaceYar design system.

Use the same:

* White background
* SpaceYar red
* Typography
* Button language
* Border radius
* Input styling
* Spacing
* Animation language

The login screen should feel like a natural continuation of onboarding.

Do not suddenly introduce a completely different design.

⸻

21. LOGIN DESIGN

Create:

SpaceYar branding

Headline:

Welcome back

Supporting message:

Sign in to continue to SpaceYar.

Fields:

* Email
* Password

Actions:

* Login
* Forgot password?
* Create account

Primary Login button should use the SpaceYar red.

Inputs should have:

* Clean white/neutral surface
* Subtle border
* Strong focus state
* Red focus accent
* Clear error state

The page should feel spacious and premium.

⸻

22. LOGIN ANIMATION

When the login screen appears:

* Branding should enter subtly.
* Heading should fade/slide into position.
* Form should follow.
* CTA should appear naturally.

Do not create a long animation.

The user should be able to interact with the form immediately.

Buttons should have subtle:

* Hover animation
* Press animation
* Focus animation

Use Motion where it genuinely improves the interaction.

⸻

23. SPACEYAR BUTTON SYSTEM

Create a reusable primary button.

Primary:

SpaceYar red background
White text

Hover:

Slightly darker/red variation

Press:

Subtle scale reduction

Focus:

Accessible visible focus indicator

The button should feel tactile without being gimmicky.

Create reusable button styles rather than recreating buttons independently on every screen.

⸻

24. TYPOGRAPHY

Choose a modern, highly readable typeface.

Prefer a clean contemporary sans-serif.

The typography should have:

* Strong display hierarchy
* Confident headlines
* Comfortable body text
* Clear button labels

Do not use decorative fonts.

Use consistent typography tokens.

⸻

25. SHADOWS AND RADIUS

Use subtle shadows.

Avoid huge floating shadows.

Use consistent border-radius values throughout the application.

Images, buttons, cards and inputs should feel like they belong to the same design system.

⸻

26. ICONS

If icons are needed, use a consistent icon library.

Do not mix random icon styles.

Icons should be minimal and modern.

Do not introduce icons simply for decoration.

⸻

27. ACCESSIBILITY

Implement:

* Keyboard navigation
* Visible focus states
* Accessible labels
* Meaningful image alt text
* Correct button semantics
* Appropriate contrast
* Reduced-motion support

Animations must never make the application unusable.

⸻

28. PERFORMANCE

Keep the initial experience fast.

Optimize images.

Avoid unnecessary JavaScript.

Only use Client Components where interaction requires them.

Keep the splash/onboarding animation performant on mobile.

Avoid unnecessary dependencies.

⸻

29. CODE ARCHITECTURE

Use a maintainable structure.

For example:

app/
page.tsx
onboarding/
page.tsx
login/
page.tsx

components/
branding/
splash/
onboarding/
auth/
ui/

lib/
constants/
utils/

public/
images/

You may modify this structure if the repository already has a better architecture.

Create reusable components such as:

* SpaceYarLogo
* PrimaryButton
* OnboardingCarousel
* OnboardingSlide
* PaginationDots
* LoginForm

Do not make everything one enormous component.

⸻

30. DESIGN TOKENS

Centralize the SpaceYar design language.

At minimum define tokens for:

Brand red
Dark red
Light red
White
Background
Surface
Primary text
Secondary text
Border
Error

Also establish consistent:

* Spacing
* Radius
* Shadows
* Animation durations

This will become the foundation for the entire future product.

⸻

31. FUTURE-PROOFING

Do not implement Supabase authentication yet.

Do not implement databases yet.

Do not implement APIs yet.

Do not implement property listings yet.

However, the frontend architecture must make it easy to add:

* Supabase Auth
* PostgreSQL
* User profiles
* Owner accounts
* Renter accounts
* Property listings
* Search
* Favorites
* Messaging
* Notifications
* Payments
* Dashboards

later.

Do not over-engineer these future features now.

⸻

32. ROUTING FLOW

The initial experience should be:

/
↓
Splash
↓
/onboarding
↓
Owner
↔
Renter
↓
/login

Both onboarding paths should eventually lead to:

/login

Keep the selected role available in a clean way so that later we can use:

owner

or:

renter

during signup/authentication.

Do not implement the backend role system yet.

⸻

33. IMPORTANT DESIGN PRINCIPLE

You are explicitly authorized to make design decisions.

If you see an opportunity to make the interface substantially better while staying within the requirements, do it.

Do not interpret this prompt as a rigid pixel-by-pixel specification.

Use professional product-design judgment.

The goal is not merely:

“the requirements work.”

The goal is:

“This looks like the first screen of a real, premium startup.”

Think about:

* Visual hierarchy
* Composition
* Whitespace
* Balance
* Brand recognition
* Motion
* Interaction
* Responsiveness
* Accessibility
* Perceived quality

⸻

34. DO NOT OVERDESIGN

There is an important difference between:

creative

and

cluttered.

Keep SpaceYar elegant.

White should remain the dominant visual foundation.

Red should create energy and identity.

Use animation to enhance the experience, not distract from it.

When uncertain, choose the simpler and more refined solution.

⸻

35. FINAL QUALITY CHECK

After implementation:

1. Run the application.
2. Test /.
3. Test splash animation.
4. Test transition to onboarding.
5. Test Owner slide.
6. Test Renter slide.
7. Test auto-play.
8. Test swipe.
9. Test pagination dots.
10. Test previous/next behavior.
11. Test transition to login.
12. Test login form.
13. Test mobile layout.
14. Test tablet layout.
15. Test desktop layout.
16. Test keyboard navigation.
17. Test reduced-motion behavior.
18. Run TypeScript checks.
19. Run ESLint.
20. Fix all obvious issues.

Pay particular attention to:

* Overflow
* Broken animations
* Layout jumps
* Mobile spacing
* Text wrapping
* Image cropping
* Timer cleanup
* Accessibility
* Inconsistent colors
* Inconsistent spacing
* Inconsistent button styling

⸻

36. FINAL OUTPUT

Once implementation is complete, report:

1. Files created/modified
2. Dependencies added
3. Routes created
4. Components created
5. Design system established
6. Animation system used
7. Responsive behavior
8. Any assumptions made
9. Any remaining limitations

Do not merely describe the implementation.

Actually implement the application in the repository.

Do not stop at a wireframe.

Do not create a static mockup.

Build a functioning, polished first version.

Most importantly:

Approach this as both a senior frontend engineer and a senior product designer.

You are continuing development of SpaceYar.

For this phase, you must act as both:

1. Senior frontend architect
2. Senior product/UI/UX designer

The application is intended to become a long-term startup product, so do not implement this as a quick prototype. Establish a clean, scalable architecture that can support significantly different Owner and Renter experiences without duplicating the entire codebase.

⸻

1. EXISTING APPLICATION

The application already contains the initial experience:

Splash
↓
Onboarding
↓
Login

Do not unnecessarily redesign or rewrite the existing screens.

First inspect the repository and understand the current implementation.

Review:

* package.json
* app/
* components/
* lib/
* styles
* existing routing
* existing design tokens
* existing animation implementation
* existing onboarding implementation
* existing login implementation

Preserve the existing SpaceYar visual identity.

⸻

2. SPACEYAR BRAND

The application uses a strong:

WHITE + RED

visual identity.

White should remain the dominant background.

SpaceYar red should be the primary brand/action color.

The design language should remain:

* Premium
* Modern
* Clean
* Trustworthy
* Young
* Confident
* Minimal
* Tech-forward

Do not introduce unrelated colors or a completely different visual style for this new screen.

The Role Selection screen must feel like a natural continuation of the Login experience.

⸻

3. NEW USER FLOW

The updated flow is:

Splash
↓
Onboarding
↓
Login
↓
Role Selection
↓
Owner Home OR Renter Home

The new screen comes after successful login.

For now, authentication can remain mocked/UI-only if backend authentication has not yet been implemented.

However, the architecture must already be prepared for real authentication later.

⸻

4. ROLE SELECTION SCREEN

Create a dedicated screen where the user chooses their SpaceYar experience.

Primary heading:

How will you use SpaceYar?

Supporting text:

Choose your experience to get started.

Then present two prominent options:

OWNER

Suggested description:

List and manage your spaces

RENTER

Suggested description:

Discover your next space

Each option should be visually distinct but belong to the same design system.

Use two large interactive selection cards/buttons.

⸻

5. ROLE CARD DESIGN

The two options should feel premium and interactive.

Each card should contain:

* Appropriate icon or illustration
* Role name
* Short description
* Visual selection state
* Hover state
* Press state
* Focus state

When the user selects Owner:

The Owner option becomes visually active.

When the user selects Renter:

The Renter option becomes visually active.

Use SpaceYar red for the active state.

Do not make both cards overwhelmingly red.

Use white/neutral surfaces with red accents.

The selected state could include:

* Red border
* Subtle red-tinted background
* Red icon
* Check indicator
* Slight elevation
* Subtle scale animation

Use good product-design judgment.

⸻

6. INTERACTION

The selection should feel responsive.

Use Motion for React.

When a user taps/clicks a role:

* Animate the selection state.
* Provide a subtle scale/press interaction.
* Animate the active border/background.
* Update the CTA appropriately.

Avoid excessive animation.

The interaction should communicate:

“I have selected this experience.”

⸻

7. PRIMARY CTA

Add a primary CTA below the two options.

Initially:

Continue

If no role is selected:

* The button should either be disabled or clearly indicate that a selection is required.

Once a role is selected:

* Enable Continue.
* Use SpaceYar red.
* Provide a subtle hover/press animation.

On Continue:

If:

owner

navigate to the Owner experience.

If:

renter

navigate to the Renter experience.

⸻

8. ROLE MODEL

Create a proper TypeScript role type.

Do NOT use arbitrary strings throughout the application.

Create a centralized role definition such as:

export type UserRole = "owner" | "renter";

Use this type consistently throughout the application.

Do not duplicate role strings unnecessarily.

⸻

9. ROLE CONSTANTS

Create a centralized role configuration.

Conceptually:

export const ROLE_CONFIG = {
  owner: {
    label: "Owner",
    description: "List and manage your spaces",
  },
  renter: {
    label: "Renter",
    description: "Discover your next space",
  },
};

The exact implementation is up to you.

The important requirement is:

Do not hard-code role information separately inside multiple components.

This will make the application easier to extend later.

⸻

10. ARCHITECTURE

The application must NOT become:

owner-app/
renter-app/

with duplicated components.

Instead use:

shared foundation
      +
role-specific features

A scalable structure could be:

app/
  page.tsx
  login/
    page.tsx
  role-selection/
    page.tsx
  owner/
    page.tsx
  renter/
    page.tsx
components/
  ui/
  branding/
  auth/
  role-selection/
  owner/
  renter/
lib/
  auth/
  roles/
  constants/
  utils/
types/
  auth.ts
  roles.ts

Adapt this to the existing repository if necessary.

Do not blindly copy this structure if the existing project already has a cleaner architecture.

⸻

11. SHARED VS ROLE-SPECIFIC COMPONENTS

Think carefully about component ownership.

Shared components should include things like:

* Button
* Input
* Logo
* Header
* Navigation primitives
* Avatar
* Modal
* Toast
* Loading states
* Empty states
* Error states
* Layout primitives

Owner-specific components should live under:

components/owner/

Renter-specific components should live under:

components/renter/

Do not put Owner-specific business logic into generic components.

Do not put Renter-specific business logic into generic components.

⸻

12. OWNER AND RENTER HOME

For this phase, create only a basic placeholder Home page for each role.

Do NOT build the complete dashboard.

Create:

/owner

and:

/renter

Each should clearly demonstrate that the role selection worked.

Owner:

Welcome to SpaceYar, Owner

Renter:

Welcome to SpaceYar, Renter

Use the same SpaceYar visual language.

These are temporary foundations for the real role-specific home experiences that will be developed later.

⸻

13. ROLE-AWARE ROUTING

Create clean routes.

At minimum:

/
 /onboarding
 /login
 /role-selection
 /owner
 /renter

The flow should be:

/login
   ↓
/role-selection
   ↓
/owner

or:

/login
   ↓
/role-selection
   ↓
/renter

Do not create complicated routing infrastructure unnecessarily at this stage.

However, structure the code so that authentication and authorization can later control access to these routes.

⸻

14. IMPORTANT: ROLE IS NOT AUTHORIZATION YET

Understand the distinction between:

Selected role

and

Authenticated user’s persisted role.

For this phase, role selection can be temporary client-side state.

Later, when Supabase authentication is implemented, the user’s role should be persisted in the database and associated with their account.

Do not pretend that a client-side role variable is secure authorization.

Never use client-side state alone to protect Owner functionality.

⸻

15. FUTURE SUPABASE ARCHITECTURE

Do not implement Supabase yet unless it already exists in the repository.

However, prepare for a future architecture like:

Supabase Auth
      ↓
Authenticated User
      ↓
User Profile
      ↓
User Role
      ↓
Owner / Renter Experience

The eventual database might contain concepts such as:

profiles
  id
  user_id
  role
  name
  avatar_url
  created_at
  updated_at

Do not create the database yet.

Do not create migrations yet.

Do not invent unnecessary backend infrastructure.

Just make the frontend architecture compatible with this future model.

⸻

16. ROLE PERSISTENCE

For the current prototype:

Use a simple temporary mechanism if necessary.

For example:

* React state
* URL state
* temporary client storage

But keep this isolated behind a small abstraction.

For example, conceptually:

lib/roles/
  role-storage.ts

The rest of the application should not directly manipulate localStorage.

This allows us to replace temporary storage with Supabase later without rewriting every component.

⸻

17. ROLE SERVICE / ABSTRACTION

Create a small role abstraction where appropriate.

For example, conceptually:

getSelectedRole()
setSelectedRole(role)
clearSelectedRole()

The exact implementation is your decision.

The purpose is to prevent role persistence logic from leaking throughout the application.

Do not over-engineer this into a huge state-management system.

⸻

18. FUTURE AUTHENTICATION

The eventual system should support:

* Login
* Signup
* Logout
* Password reset
* Session persistence
* User profile
* Role persistence
* Protected routes

The architecture should allow these to be added without restructuring the entire application.

Do not implement these features now unless they already exist.

⸻

19. OWNER VS RENTER EXPERIENCE

Understand that Owner and Renter will eventually have significantly different products.

Owner might eventually have:

* Owner dashboard
* Add property
* Manage properties
* Property analytics
* Leads/inquiries
* Messages
* Availability
* Earnings
* Profile

Renter might eventually have:

* Property discovery
* Search
* Filters
* Saved properties
* Applications
* Messages
* Visits
* Profile

Do NOT implement these features now.

But organize the code so these features can naturally live inside their respective feature boundaries later.

⸻

20. DESIGN THE ROLE SELECTION SCREEN AS A KEY PRODUCT MOMENT

This is an important screen.

Do not treat it as a boring form.

It represents the moment where SpaceYar asks:

“Who are you here as?”

The design should communicate that the platform adapts to the user.

Make the experience feel intentional.

Possible visual concept:

Large centered headline.

Two elegant cards beneath it.

Owner card:

Property/listing-oriented visual.

Renter card:

Discovery/home-oriented visual.

Then:

Continue

Use subtle red visual accents to tie everything together.

Do not copy another company’s UI.

Create an original SpaceYar experience.

⸻

21. RESPONSIVE DESIGN

The role-selection screen must work beautifully on:

Mobile

Approximately:

320px–480px

Cards should stack vertically.

Touch targets must be comfortable.

No horizontal overflow.

Tablet

Approximately:

768px–1024px

Cards can be placed side-by-side if the composition remains comfortable.

Desktop

1280px+

Use a balanced two-column composition.

Do not stretch the cards unnecessarily.

Maintain generous whitespace.

⸻

22. ACCESSIBILITY

The role selection must be keyboard accessible.

Users should be able to:

* Tab between role options.
* See which option has focus.
* Select an option.
* Continue using keyboard controls.

Use semantic buttons where appropriate.

Do not create clickable <div> elements when a semantic button is more appropriate.

Ensure sufficient color contrast.

Do not rely solely on color to communicate selection.

Use visual state such as:

* Border
* Check icon
* Background
* Text/icon treatment

⸻

23. ANIMATION SYSTEM

Continue using the existing SpaceYar animation language.

Use Motion for React.

Establish consistency in:

* Duration
* Easing
* Spring behavior
* Hover interactions
* Press interactions
* Page transitions

Do not introduce a separate animation philosophy for the role-selection screen.

The transition from Login → Role Selection → Home should feel like one continuous product.

⸻

24. DESIGN TOKENS

If the project doesn’t already have a proper design token system, establish one.

At minimum:

Brand
Background
Surface
Primary text
Secondary text
Border
Success
Error
Warning

The core SpaceYar identity remains:

White + Red

Do not create arbitrary red values throughout individual components.

⸻

25. ERROR AND EDGE CASES

Handle:

* No role selected
* Rapidly clicking role cards
* Rapidly clicking Continue
* Navigation during animation
* Browser refresh
* Missing temporary role
* Invalid role
* Direct navigation to /owner
* Direct navigation to /renter

For now, direct access behavior can remain simple because authentication isn’t implemented.

But do not crash if role state is missing.

⸻

26. SECURITY PRINCIPLE

Never assume:

client-selected role = trusted authorization

The future Owner experience may contain sensitive functionality.

When backend authentication is introduced:

* Validate the authenticated session server-side.
* Retrieve the user’s persisted role.
* Enforce authorization server-side.
* Use Supabase Row Level Security where appropriate.

For now, simply structure the application so this can be added later.

⸻

27. STATE MANAGEMENT

Do not install Redux or another large state-management framework just for this feature.

Use:

* React state
* Context only when genuinely needed
* Small abstractions for role state

The application is still small.

Introduce global state only when the product actually requires it.

⸻

28. TESTABILITY

Keep role selection logic separate enough that it can later be tested independently.

The following behavior should be straightforward to test:

No selection → Continue unavailable
Owner selected → Owner active
Renter selected → Renter active
Owner + Continue → /owner
Renter + Continue → /renter

⸻

29. CODE QUALITY

Before finishing:

* No TypeScript errors
* No ESLint errors
* No unused imports
* No unnecessary any
* No duplicated role definitions
* No duplicated UI components
* No unnecessary dependencies
* No console errors
* No memory leaks
* Proper animation cleanup
* Proper responsive behavior

⸻

30. DO NOT OVER-ENGINEER

The goal is:

robust architecture, not unnecessary complexity.

Do not add:

* Redux
* Zustand
* complex dependency injection
* unnecessary service layers
* premature backend APIs
* unnecessary design systems
* unnecessary packages

unless the existing project genuinely requires them.

Keep the architecture clean and understandable.

⸻

31. FINAL USER EXPERIENCE

The finished flow should feel like:

Splash

SpaceYar branding animation

↓

Onboarding

Owner / Renter introduction

↓

Login

Clean SpaceYar authentication UI

↓

Role Selection

How will you use SpaceYar?

[ OWNER ]

[ RENTER ]

↓

Continue

↓

Owner:

Owner Home

or

Renter:

Renter Home

Every transition should feel smooth and consistent.

⸻

32. IMPLEMENTATION INSTRUCTION

Do not merely explain what you would do.

Actually implement the feature in the repository.

First inspect the existing code.

Then:

1. Establish/refine the role architecture.
2. Create the role type.
3. Create centralized role configuration.
4. Create the Role Selection screen.
5. Create reusable role-selection components.
6. Add animations.
7. Add responsive behavior.
8. Add routing.
9. Create minimal Owner and Renter home placeholders.
10. Integrate the existing Login flow with Role Selection.
11. Verify the complete flow.
12. Run TypeScript checks.
13. Run ESLint.
14. Fix all obvious issues.

Do not rewrite existing working screens unnecessarily.

⸻

33. FINAL REPORT

After implementation, report:

* Existing architecture you discovered
* Architecture changes made
* Files created/modified
* Components created
* Routes created
* Role model
* Temporary role persistence mechanism
* How Owner/Renter routing works
* How the architecture will connect to Supabase later
* Any limitations
* Any recommendations for the next development phase

Remember:

You are designing the foundation of a real startup, not just completing a UI task.

Make the implementation clean enough that another senior engineer can join the project six months from now and immediately understand the architecture.

Continue developing SpaceYar.

For this task, implement the authentication experience on the existing Login screen and establish a scalable authentication architecture that can later be connected to Supabase Auth.

Act as both:

* Senior frontend engineer
* Senior product/UI/UX designer

Do not treat this as a simple form-building task. The authentication experience must look like a polished consumer application comparable in quality to modern travel, rental and marketplace products.

⸻

1. IMPORTANT: INSPECT THE EXISTING PROJECT FIRST

Before making changes:

* Inspect the current repository.
* Inspect the existing Login page.
* Inspect existing components.
* Inspect the SpaceYar design tokens.
* Inspect the current routing.
* Inspect any existing authentication-related code.
* Inspect whether Supabase is already installed/configured.

Do not overwrite working code unnecessarily.

Preserve the existing SpaceYar design system.

⸻

2. EXISTING SPACEYAR DESIGN LANGUAGE

The SpaceYar visual identity is:

WHITE + RED

Maintain the existing design system.

The authentication experience should use:

* White as the primary background.
* SpaceYar red as the primary action color.
* Dark charcoal/near-black for primary text.
* Neutral grey for secondary text.
* Subtle borders.
* Subtle shadows.
* Consistent border radius.
* Existing SpaceYar typography.
* Existing SpaceYar animation language.

Do not introduce a new visual style.

The login and signup experiences must look like they belong to the same product as:

* Splash
* Onboarding
* Role Selection
* Owner Home
* Renter Home

⸻

3. AUTHENTICATION METHODS

SpaceYar should eventually support:

Social authentication

1. Google
2. Facebook

Traditional authentication

3. Email + Password

The UI should clearly communicate these options.

Use the correct provider terminology:

Continue with Google

not:

Continue with Gmail

For Facebook:

Continue with Facebook

⸻

4. LOGIN SCREEN STRUCTURE

Redesign/refine the existing Login screen into a polished authentication experience.

Recommended hierarchy:

SpaceYar logo

↓

Welcome headline

Welcome back

↓

Supporting text

Sign in to continue to SpaceYar.

↓

Google button

Continue with Google

↓

Facebook button

Continue with Facebook

↓

Divider

OR

↓

Email input

↓

Password input

↓

Forgot password?

↓

Primary CTA

Log in

↓

Signup prompt

Don’t have an account? Sign up

Use appropriate spacing and hierarchy.

Do not overcrowd the screen.

⸻

5. SOCIAL LOGIN BUTTONS

Create reusable social authentication buttons.

Create a reusable component conceptually similar to:

SocialAuthButton

It should support different providers.

For example:

Google
Facebook

Do not create two completely unrelated components.

The component should accept configuration such as:

* provider
* label
* icon
* loading state
* disabled state
* click handler

⸻

6. GOOGLE BUTTON

Create:

Continue with Google

Use the official Google “G” visual treatment appropriately.

Do not create a random red Google icon.

The Google brand should retain its recognizable branding.

However, the button itself should still feel integrated into the SpaceYar design system.

Suggested visual treatment:

* White background
* Neutral border
* Dark text
* Google icon
* Subtle hover state
* Subtle press animation

Do not make the Google button SpaceYar red.

The provider identity should remain recognizable.

⸻

7. FACEBOOK BUTTON

Create:

Continue with Facebook

Use the recognizable Facebook icon.

Keep the button visually consistent with the Google button.

Do not introduce an entirely different button style.

Provider branding belongs in the icon/label.

The overall authentication system should still feel like SpaceYar.

⸻

8. EMAIL/PASSWORD LOGIN

Keep traditional authentication.

Fields:

Email

Placeholder:

Enter your email

Password

Placeholder:

Enter your password

Add a password visibility toggle.

The user should be able to:

* Show password
* Hide password

Use an appropriate accessible icon.

⸻

9. FORM VALIDATION

Implement frontend validation.

Email:

* Required
* Valid email format

Password:

* Required
* Minimum length should be defined in one centralized validation rule.

Do not duplicate validation logic.

Show clean inline error states.

For example:

Invalid email:

Please enter a valid email address.

Empty password:

Please enter your password.

Do not use browser-default ugly alerts.

Errors should visually fit the SpaceYar design system.

⸻

10. LOADING STATES

All authentication methods need loading states.

For example:

Google:

Connecting…

Facebook:

Connecting…

Email login:

Signing in…

Disable the relevant controls while authentication is processing.

Prevent double submission.

Use subtle animation.

Do not allow the user to accidentally trigger multiple authentication requests.

⸻

11. AUTHENTICATION ARCHITECTURE

IMPORTANT:

Do not tightly couple the UI to Supabase.

Create a clean authentication abstraction.

Conceptually:

components/auth/
    LoginForm
    SocialAuthButton
lib/auth/
    auth-client
    auth-types

The exact file structure is your decision based on the existing repository.

The UI should call an authentication function rather than directly implementing provider-specific logic everywhere.

Conceptually:

signInWithGoogle()
signInWithFacebook()
signInWithEmail(email, password)
signUpWithEmail(email, password)

These functions can initially be placeholders if Supabase is not configured.

⸻

12. SUPABASE COMPATIBILITY

The eventual authentication provider will be:

Supabase Auth

Do not implement a custom authentication system.

Do not store passwords manually.

Do not create a custom OAuth implementation.

Do not store authentication credentials in localStorage.

When Supabase is connected, use Supabase’s supported OAuth flow.

The architecture should allow:

SpaceYar UI
      ↓
Auth abstraction
      ↓
Supabase Auth
      ↓
Google / Facebook / Email

⸻

13. OAUTH REDIRECT ARCHITECTURE

Prepare the application for OAuth redirects.

The eventual flow should be conceptually:

SpaceYar
   ↓
Continue with Google
   ↓
Google authentication
   ↓
OAuth callback
   ↓
SpaceYar
   ↓
Authenticated session
   ↓
Role Selection / appropriate destination

And similarly:

SpaceYar
   ↓
Continue with Facebook
   ↓
Facebook authentication
   ↓
OAuth callback
   ↓
SpaceYar

Do not fake OAuth success.

If the provider is not configured yet, make the UI gracefully indicate that authentication is not currently connected rather than pretending that login succeeded.

⸻

14. SIGNUP EXPERIENCE

The login screen should provide:

Don’t have an account? Sign up

Clicking Sign up should navigate to:

/signup

Create a clean signup page.

The signup screen should support:

* Continue with Google
* Continue with Facebook
* Email
* Password
* Confirm password
* Create account

Recommended heading:

Create your SpaceYar account

Supporting text:

Join SpaceYar and find the experience that fits you.

Keep the same design language as Login.

⸻

15. LOGIN ↔ SIGNUP

Provide navigation between:

/login

and:

/signup

Login:

Don’t have an account? Sign up

Signup:

Already have an account? Log in

Use smooth page transitions where appropriate.

Do not create duplicate authentication UI.

Reuse components.

⸻

16. ROLE SELECTION INTEGRATION

Remember that SpaceYar has two user roles:

owner
renter

Authentication and role selection are separate concepts.

The expected eventual flow should be:

Onboarding
    ↓
Login / Signup
    ↓
Authentication
    ↓
Role Selection
    ↓
Owner Home / Renter Home

Do NOT infer the user’s role from whether they selected Google, Facebook or email.

The authentication provider does not determine whether someone is an Owner or Renter.

⸻

17. SOCIAL AUTH + ROLE SELECTION

After successful Google/Facebook authentication:

If the user has no existing SpaceYar role:

→ send them to:

/role-selection

If the user already has a persisted SpaceYar role:

→ send them to their appropriate experience.

Conceptually:

Authenticated user
       ↓
Does role exist?
     /     \
   No       Yes
   ↓         ↓
Role       Check role
Selection    ↓
          Owner/Renter

This logic should eventually live in an authentication/session layer, not inside individual buttons.

For the current implementation, mock this behavior if Supabase is not connected.

⸻

18. NEW USER VS RETURNING USER

The architecture should eventually distinguish:

New user

Authenticated but no SpaceYar profile/role.

Destination:

/role-selection

Existing user

Authenticated and has a role.

Owner:

/owner

Renter:

/renter

Do not implement a complex onboarding state machine yet.

Just structure the code so this logic can be added cleanly.

⸻

19. AUTH CALLBACK

Prepare an appropriate callback route for future OAuth.

For example:

/auth/callback

Use the architecture recommended by the eventual Supabase integration.

Do not implement insecure client-side token handling.

Do not expose credentials.

Do not put secrets into frontend environment variables.

⸻

20. ENVIRONMENT VARIABLES

If Supabase is not yet configured:

Do not invent credentials.

Do not hard-code credentials.

Do not create fake secrets.

If environment variables are needed, use placeholders such as:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Use the current Supabase-recommended naming/configuration when actual integration is performed.

Do not commit .env.local.

Ensure secrets remain outside Git.

⸻

21. ERROR STATES

Design proper authentication error states.

Examples:

Google authentication failed.

Facebook authentication failed.

Invalid email/password.

Account does not exist.

Incorrect password.

Network error.

Authentication cancelled.

OAuth callback failed.

Do not expose raw technical errors directly to users.

Display user-friendly messages.

Log technical details appropriately during development without exposing sensitive information.

⸻

22. ACCESSIBILITY

Authentication is a critical user flow.

Ensure:

* Inputs have labels.
* Buttons have accessible names.
* Social buttons are keyboard accessible.
* Focus states are visible.
* Password visibility control is accessible.
* Errors are associated with the relevant inputs.
* Color is not the only way to communicate errors.
* Touch targets are sufficiently large.
* Contrast is appropriate.

⸻

23. RESPONSIVE DESIGN

The authentication experience must work on:

Mobile:
320px–480px

Tablet:
768px–1024px

Desktop:
1280px+

Mobile should prioritize:

* Comfortable spacing
* Easy typing
* Large touch targets
* No horizontal overflow
* Clear hierarchy

Desktop should use a polished centered composition.

Do not make the form unnecessarily wide.

A max-width around 400–460px can be considered, but use design judgment.

⸻

24. ANIMATIONS

Use Motion for React consistently with the existing SpaceYar animation system.

When entering Login:

* Logo fades/slides in.
* Heading follows.
* Social buttons appear.
* Divider/form follows.
* CTA appears.

Keep it fast.

For interactions:

* Button hover
* Button press
* Input focus
* Error state
* Loading state

Use subtle motion.

Do not make authentication feel slow.

⸻

25. MOBILE UX

Pay particular attention to mobile.

The user may be using:

* iPhone
* Android
* Mobile Safari
* Chrome mobile

Ensure:

* Inputs don’t cause layout problems.
* Keyboard doesn’t obscure the CTA.
* Buttons remain accessible.
* OAuth buttons are easy to tap.
* Password visibility toggle works.
* Form doesn’t jump unexpectedly.

⸻

26. SECURITY PRINCIPLES

Never:

* Store passwords yourself.
* Store OAuth tokens manually in localStorage.
* Hard-code secrets.
* Trust client-side role state for authorization.
* Implement fake authentication that looks successful.

The frontend is responsible for UX.

Supabase/Auth will eventually be responsible for authentication.

Backend authorization must later enforce Owner/Renter permissions.

⸻

27. COMPONENT ARCHITECTURE

Create reusable components where appropriate.

Possible structure:

components/
  auth/
    LoginForm.tsx
    SignupForm.tsx
    SocialAuthButton.tsx
    AuthDivider.tsx
    PasswordInput.tsx
  branding/
    SpaceYarLogo.tsx
  ui/
    Button.tsx
    Input.tsx

Do not duplicate Google/Facebook buttons.

Do not duplicate password inputs.

Do not duplicate authentication layouts.

⸻

28. TYPES

Use TypeScript types.

For example:

type AuthProvider = "google" | "facebook";

And use centralized types/configuration.

Do not scatter provider strings throughout the code.

⸻

29. DESIGN SYSTEM CONSISTENCY

The following must all look like one product:

Splash
↓
Onboarding
↓
Login
↓
Signup
↓
Role Selection
↓
Owner Home
↓
Renter Home

Use the same:

* Brand red
* Typography
* Button language
* Radius
* Spacing
* Input styling
* Animation language
* Icon style

Do not create an isolated authentication design.

⸻

30. IMPORTANT: DON’T BUILD THE BACKEND YET

If Supabase is not already configured:

Do not spend this task building the backend.

Implement:

* Authentication UI
* Authentication abstraction
* Routing
* Loading/error states
* Future OAuth integration points

Then stop.

The next phase can connect:

Google OAuth
Facebook OAuth
Email/password
Supabase Auth
Session management
Database profile
Role persistence

⸻

31. TEST THE COMPLETE FLOW

After implementation test:

Login

/login

Signup

/signup

Social buttons

Google

Facebook

Email validation

Invalid email

Empty password

Password visibility

Show/hide

Loading states

All authentication methods

Navigation

Login → Signup

Signup → Login

Role integration

Authenticated user → Role Selection

Responsive

Mobile

Tablet

Desktop

Accessibility

Keyboard

Focus

Screen-reader labels

Code quality

TypeScript

ESLint

No console errors

⸻

32. FINAL IMPLEMENTATION REQUIREMENT

Do not just explain the implementation.

Actually modify the repository.

First inspect the existing code.

Then implement the authentication experience.

Do not rewrite existing SpaceYar screens unless necessary.

Use professional product-design judgment.

The result should feel like a polished consumer marketplace application while still being unmistakably SpaceYar.

⸻

33. FINAL REPORT

After implementation, report:

1. Files created/modified
2. Components created
3. Routes created
4. Authentication abstraction
5. Google integration status
6. Facebook integration status
7. Email authentication status
8. Current mock/real behavior
9. Role-selection integration
10. Future Supabase integration plan
11. Any environment variables required
12. Any remaining limitations

Do not claim that Google/Facebook authentication is functional unless it is actually connected to a real authentication provider.

Build the UI and architecture now; keep the implementation honest about what is and isn’t connected.