# Store listings

Every value typed into App Store Connect and Play Console. Change it here in the same sitting as
the console. No other platform is named anywhere in store copy (guideline 2.3.10).

## Identity

| | |
|---|---|
| Name | Eatery: Home Dining |
| Bundle id / package | `com.andresinp.eatery` |
| App Store Connect SKU | `eatery-ios` |
| Primary language | English (U.S.) |
| Category | Food & Drink (secondary: Lifestyle) |
| Price | Free |
| Age rating | 17+ on iOS (user-generated content, meeting strangers); Play: questionnaire answers below |
| Support URL | https://andresinp.github.io/eatery-legal/ |
| Privacy policy URL | https://andresinp.github.io/eatery-legal/privacy.html |
| Account deletion URL | https://andresinp.github.io/eatery-legal/delete-account.html |
| Support email | andresinp@gmail.com |

## Subtitle (30)

Home-cooked meals near you

## Promotional text (170)

Book a seat at a neighbour's table or pick up homemade food. Pay a small deposit in the app, the rest to your host in person.

## Keywords (100)

home cooking,supper club,dinner,local food,homemade,host,meal,table,chef,neighbours,food sharing

## Description

Eatery connects people who love to cook with people who love to eat.

FIND A TABLE
Browse a live map of home-cooked meals near you: a Sunday lunch, a mezze evening, a box of fresh baklava. Filter by cuisine, diet, price and date, and hide anything with allergens you avoid.

BOOK IN SECONDS
Reserve your seat with a small deposit by card. You pay the rest to your host in person. The host's exact address is shared only once you have booked.

HOST YOUR OWN
Open seats at your table or sell homemade food for pickup. Add photos, set the price and currency, place the pin, and Eatery suggests a description and possible allergens for you.

STAY IN TOUCH
Chat with your host or guests, get reminders before the meal, and leave a review afterwards.

SAFE BY DESIGN
Public pins show only the neighbourhood. Ratings and reviews come from real bookings. You can report or block anyone, and delete your account from the app at any time.

Available in English, Spanish, Turkish, French, German, Italian, Portuguese, Arabic, Russian, Chinese, Japanese and Albanian.

## App Review — sign-in information

Demo account: `andresinp+eatery-review@gmail.com`. The password is in
`~/.eatery-signing/review-account.txt` (never in the repo); paste it into App Store Connect by
hand.

## App Review — notes (keep identical to any reply)

Eatery is a marketplace for home-cooked meals: hosts open seats at their own table or sell homemade food for pickup, and guests book through the app.

Demo account: sign in with the email and password above (Profile tab > Sign in > Continue with email). Sign in with Apple and a new email account also work.

Main features, from the tab bar:
- Explore: map and list of meals; tap a price pin, then "Book".
- Bookings: upcoming and past bookings; open one to chat with the host, add it to the calendar, cancel, or leave a review after the meal.
- Host: "New listing" walks through photos, details, price, the map pin and publishing.
- Inbox: messages and notifications.
- Profile: settings, language, notification preferences, report/block, and Settings > Delete account (deletes immediately, refunds any deposits).

Payments (3.1.5(a)): the deposit pays for a physical, in-person service, a meal eaten at the host's home or food picked up, so it is charged through Stripe's payment sheet. Nothing digital is sold, and the balance is paid to the host in person.

User-generated content (1.2): listings, profiles, reviews and messages can be reported from each screen (flag icon) and any user can be blocked; blocked users' listings and messages are hidden. Reports are reviewed by the operator within 24 hours.

Permissions: location while using the map (to show nearby meals; never in the background), photos and camera (listing and profile photos), calendar (add a booking), notifications (booking updates and reminders).

External services: Supabase (database, sign-in, storage), Stripe (payments and refunds), Anthropic (suggests a listing description and possible allergens when a host asks), OpenFreeMap (map tiles), Expo push service (notifications).

Regional differences: none. The UI is translated into 12 languages and follows the device language.

## Play Console — content answers

- Ads: no. Target audience: 18+. News app: no. Government app: no. Financial features: no (deposits are payments for goods/services through Stripe).
- Data safety: collects email, name, photos, approximate and precise location (in use only), messages, purchase history, app interactions; all encrypted in transit; deletion available in-app and at the account deletion URL; nothing shared for advertising.
- Content rating questionnaire: user interaction (users can communicate, share location), no violence, no gambling.
