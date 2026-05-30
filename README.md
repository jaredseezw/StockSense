# StockSense
Milestone 1 Submission
Team Name:
StockSense
Proposed Level of Achievement: 
Apollo 11

Motivation
Investing is one of the most important financial skills a young adult can develop — yet most beginners never start. Not because they lack interest, but because every existing tool either overwhelms them or bores them.
When we first started exploring investing, the gap was immediately obvious. Platforms like Moomoo, Tiger Trade, and Interactive Brokers throw you into live trading dashboards packed with complex charts, order books, and jargon that means nothing to a first-time user. On the other end, educational sites like Investopedia provide walls of text with no interactive element — you can read about P/E ratios all day without ever seeing what one looks like in context.
There is no tool that does both: explains things simply and lets you safely try them at the same time.
We surveyed peers in NUS and found a consistent pattern: students want to start investing but feel paralysed by the learning curve. They abandon platforms not because they lack motivation, but because the first experience is alienating. StockSense is the starting point that none of us had.
Beyond our immediate peer group, this problem is widespread across Southeast Asia, where financial literacy education in schools is minimal and investing culture is growing rapidly among young adults. The population that needs beginner-focused financial tools is large and underserved.

Aim
We hope to build StockSense, a beginner-focused stock learning web application that bridges the gap between raw financial data and genuine understanding.

Unlike existing platforms that either overwhelm beginners with data or teach theory without practice, StockSense combines both:
Users can explore real historical stock data pulled live via the yfinance API
Users can read plain-English explanations of what every key metric means, with visual demonstrations
Users can simulate buying and selling stocks using a virtual $10,000 portfolio with zero financial risk
Users can learn from the AI assistant through beginner-friendly explanations of stock movements
Users can track their knowledge growth through quizzes and a gamified leaderboard
The goal is not to replace professional trading platforms or provide financial advice. It is to give beginners the knowledge and confidence to eventually use those platforms on their own terms.

Vision
StockSense is built around one core conviction: financial literacy should be accessible to everyone, not just those who already understand the jargon.

Why Beginner-Focused?
The investing gap disproportionately affects young people from non-finance backgrounds. A Computer Science or Arts student at NUS has no formal investing education. When they decide to invest their first paycheck, they face a choice between confusing live platforms or dry textbook content. Neither builds confidence.
StockSense occupies the middle ground: real data, simplified context, safe practice. We believe that if someone can comfortably explain what a P/E ratio means and why it matters, they are already more prepared than most first-time investors.

Design Philosophy
Principle
How We Apply It
Beginner-first
Every metric explained in plain English before numbers are shown
Learn by doing
Virtual portfolio lets users practice without fear
Visual learning
Charts, gauges, and diagrams replace walls of text
Safe environment
No real money, no pressure, no complex order types
Progressive depth
Surface-level tooltips with optional deep dives



User Profiling
We identified four primary user archetypes through peer interviews and observation.

Profile 1 — The Curious University Student
Name
Wei Jie, 20
Background
Year 2 NUS Business student
Income
Part-time tutoring, ~$500/month
Investing experience
None
Devices
Laptop (primary), iPhone


Goals:
Start investing before graduation
Understand what friends mean when they talk about "NVDA going crazy"
Not embarrass himself in conversations about markets
Frustrations:
Every investing app assumes he already knows what EPS means
YouTube videos are either too basic ("what is a stock") or too advanced ("options Greeks")
Has a Moomoo account but has never placed a trade because the interface scares him
Pain Points:
Doesn't know what metrics to look at when evaluating a stock
Afraid of losing money so avoids real investing entirely
Can't find a tool that lets him practice safely

What StockSense gives him:
A dashboard that surfaces real stock data with plain-English explanations, and a $10,000 virtual portfolio to practice with before committing real money.
Profile 2 — The Young Working Adult
Name
Sarah, 24
Background
First year at a tech startup
Income
$3,500/month, growing savings
Investing experience
Has a CPF and a bank savings account
Devices
MacBook, Android phone


Goals:
Put her savings to work
Understand whether to invest in index funds or individual stocks
Build long-term wealth without spending hours on research
Frustrations:
Financial advisors try to sell her products rather than educate her
Reddit threads about investing are polarising and often contradictory
Doesn't trust herself to pick individual stocks
Pain Points:
Doesn't know the difference between market cap categories (small, mid, large)
Unsure what dividend yield means for her investment strategy
Has no mental model for evaluating risk
What StockSense gives her:
Sector-based browsing, metric explanations with real-world context, and a simulator to compare portfolio strategies over historical data.

Profile 3 — The Finance-Curious Hobbyist
Name
Marcus, 22
Background
Year 3 Computer Science student
Income
Freelance development projects
Investing experience
Has read about investing but never acted
Devices
Desktop and laptop


Goals:
Understand why certain tech stocks perform so differently despite similar products
Learn the mechanics behind market movements
Eventually manage a real portfolio confidently
Frustrations:
Knows how to find data but doesn't know how to interpret it
Charts without context feel meaningless
Most "beginner" guides still use jargon
Pain Points:
Wants to understand the relationship between EPS growth and stock price
Doesn't know what beta means in practical terms
Has no benchmark to evaluate whether a P/E ratio is high or low
What StockSense gives him:
Visual metric explainers (gauges, range bars, bubble charts) that put numbers in context, plus an AI assistant for follow-up questions.

Profile 4 — The Risk-Averse First-Timer
Name
Priya, 21
Background
NUS Year 2 Psychology student
Income
Allowance and part-time retail work
Investing experience
None
Devices
iPhone, iPad


Goals:
Understand the basics of investing without committing any money
Learn at her own pace without feeling judged or overwhelmed
Build enough confidence to open a real brokerage account
Frustrations:
Feels stupid asking basic questions on finance forums
Worried about making irreversible mistakes
Investing culture feels intimidating and male-dominated
Pain Points:
Needs explanations that don't assume prior knowledge
Wants to explore without consequences
No tool currently makes the learning process feel safe
What StockSense gives her:
A fully safe demo environment with zero financial risk, progressive learning modules, and beginner-designed explanations that never assume prior knowledge.

User Stories
1. As a university student who wants to start investing but has no prior experience, I want to be able to search for a stock and see its historical price chart displayed in a simple, readable format so that I can understand how the stock has performed over time. 
2. As a beginner investor who is confused by financial jargon, I want to be able to view plain-English explanations of key metrics (such as P/E ratio, market capitalisation, and trading volume) so that I can understand what these numbers actually mean.
3. As a user who wants to practise investing without risking real money, I want to be able to create an account and receive a virtual portfolio of $10,000 so that I can simulate buying and selling stocks based on real historical data. 
4. As a user who has made a simulated investment, I want to be able to fast-forward time to a later date so that I can see how my portfolio would have performed and learn from the outcome. 
5. As a curious learner who wants to understand why a stock price changed, I want to be able to ask an AI chatbot about a specific stock movement so that I can receive a simple explanation of the likely causes. 
6. As a user who wants to test my investing knowledge, I want to be able to take short quizzes on investing concepts, earn points for correct answers, and see how I rank against other users on a global leaderboard so that I can track my learning progress and stay motivated to improve. 

Scope of Project
StockSense is a web application accessible on desktop and mobile browsers. It is not a native mobile app or a real brokerage.

In Scope
Real stock data — Historical prices, key metrics via yfinance
Search & discovery — Ticker/name search, sector browsing, trending stocks
Educational content — Metric explainers, visual aids, beginner guides
Portfolio simulation — Virtual $10,000 account, buy/sell, P&L tracking
Historical simulation — Choose a start date, fast-forward, see outcome
AI assistant — Beginner-friendly explanations of stock movements
Gamification — Quizzes, points, leaderboard
Authentication — Firebase email/password sign-up and login
Out of Scope
Real money trading or brokerage integration
Financial advice or personalised investment recommendations
Options, futures, or derivative instruments
Real-time streaming prices
Native iOS or Android apps

Features
Dashboard
Status: Partially Implemented
The dashboard is the first page a user sees after logging in. It provides a personalized overview of the market and the user's portfolio at a glance.

Implemented:
Personalised greeting based on time of day
Market overview strip showing S&P 500, NASDAQ, and DOW JONES with live price and daily % change
Sample Portfolio value summary card
Biggest holding card
Holdings mix pie chart
Top movers today (top 5 gainers with % change)
Daily Insight card — rotating educational tips with pagination dots
Learn metrics banner — persistent CTA for the Learn page

Planned (Milestone 2):
Live portfolio value updating as prices change
Watchlist widget
Market news integration

Stock Search
Status: Fully Implemented
The stock search page allows users to search for stocks, while being suggested trending stocks as well as stocks grouped by different sectors.

Full-text search across a universe of 300+ stocks and ETFs (VOO, SPY, QQQ, ARKK, etc.)
Backend-powered live search for tickers not in the local cache
Daily Top Movers panel — side-by-side gainers and losers from real yfinance data
Browse by Sector — click any sector to see its top stocks with live prices
Recent Searches — chip buttons showing last 5 viewed stocks with name
Trending Searches — top 8 stocks sorted by popularity
Compact suggestion dropdown with ticker, company name, and sector tag

Stock Detail Page
Status: Partially Implemented
The stock detail page is the core educational page of the app. It shows everything a beginner needs to evaluate a company.

Implemented:
Live stock header — company name, ticker badge, real-time price, and daily % change
Historical price chart — rendered on an HTML5 canvas with green fill/line for positive periods, red for negative, gradient area fill under the line, hover crosshair with exact price and timestamp tooltip, % change from period open shown live as cursor moves, time range selector (1D, 1W, 1M, 3M, YTD, 1Y, 5Y, ALL), Y-axis with 5 gridlines and properly formatted price labels, X-axis with up to 6 time labels
Key Metrics panel with all 10 metrics and ? bubble tooltips: Price, P/E Ratio, Market Cap, Volume, Dividend Yield, EPS, 52-Week High/Low, Beta, Debt-to-Equity, ROE
"View full guide →" button linking to the Learn page's metrics section
Planned (Milestone 2):
Volume bar chart below the price chart
Buy/Sell action for portfolio integration
Related news headlines

Learn Page
Status: Partially Implemented
The Learn page is StockSense's educational hub. The Key Metrics tab contains 10 interactive cards, one per financial metric.

Implemented:
Each card shows a live SVG/CSS visualisation unique to that metric: Price (1-year line chart), P/E Ratio (horizontal zone scale), Market Cap (proportional bubble chart), Volume (90-day bar chart), Dividend Yield (comparative bar chart), EPS (quarterly bar chart), 52-Week High/Low (range bar), Beta (semicircle gauge), Debt-to-Equity (stacked horizontal bar), ROE (donut chart)
Each card shows a short one-line description and a "Click to read full explanation →" hint
Clicking any card opens a full-screen modal with category tag, metric name, one-line summary, larger visualisation, "Simple Explanation" section (150–200 words), and the yfinance API key
Planned (Milestone 2):
Basics tab: beginner guides on "What is a stock?", "What is diversification?", "How to read a chart?", as well as an in-depth guide for total beginners on how to invest
Interactive quizzes per metric

Portfolio
Status: Prototype (Dummy Data)

A prototype portfolio page is implemented with sample data. It is not yet connected to real buy/sell functionality.
Currently implemented (sample only):
Total portfolio value, daily P&L, cash balance stat cards
Portfolio allocation pie chart
Positions table with ticker, company name, % change, current price, total value, unrealised P&L, realised P&L, quantity
Sortable columns (all columns, with ascending/descending toggle)

Planned (Milestone 2):
Real buy/sell simulation at live market prices
Cash balance deducted on buy, credited on sell
Positions persist in Firebase
Portfolio value updates in real time
Transaction history log

Firebase Authentication
Status: Implemented

Email and password sign-up and login via Firebase Authentication
Display name customisation on sign-up
Session persistence — users stay logged in across browser refreshes
Sign out functionality
Account deletion
Guest mode — all pages accessible without login; portfolio data not saved

Historical Stock Simulator (Planned — Milestone 2)
Status: Proposed
The Historical Stock Simulator allows users to explore how a single stock performed over a selected period in the past using real historical market data.
Planned functionality:
User selects a stock and chooses a historical start date
User chooses a future end date to simulate the investment period
System calculates how the stock performed during that timeframe using real historical prices
Users can view entry price, exit price, percentage change, and simulated profit or loss
Interactive charts visualize how the stock moved throughout the selected period
AI assistant explains major events or news that may have influenced the stock’s movement during that timeframe
Users can compare different historical periods to better understand market behaviour and volatility
Why this feature matters:
Many beginner investors struggle to connect market events with actual stock performance. The Historical Stock Simulator helps users learn through exploration instead of theory alone. By replaying real market periods, users can better understand volatility, trends, and how timing affects investment outcomes — all without risking real money.

AI Assistant (Planned — Milestone 3)
Status: Proposed
Chat interface powered by the Gemini API (or equivalent free LLM)
Users can ask: "Why did Tesla drop in 2022?", "What does a P/E of 40 mean?", "Is NVIDIA overvalued?"
Responses are always beginner-friendly — no jargon without explanation
Context-aware: when opened from a stock page, the AI knows which stock is being discussed

Important note: The AI assistant will include a clear disclaimer that it is educational only and does not constitute financial advice.

Leaderboard (Planned — Milestone 3)
Status: Proposed
Quiz system covering 6+ investing topics (metrics, market concepts, risk, diversification)
5-question rounds with immediate right/wrong feedback and explanation
Points earned per correct answer, stored in Firebase
Global leaderboard showing top 20 users by total score
Personal history showing improvement over time

8. System Architecture
High-Level Architecture
USER BROWSER
  React.js Frontend (localhost:3000 / Vercel)
    Dashboard | Search/Stock Page | Learn/Account
           | REST API calls
  Flask Backend (Python) — localhost:8000 / Render
    /api/stock/ | /api/search/ | /api/market/ | In-memory TTL Cache
           |
  yfinance Library (Yahoo Finance)
  Firebase — Authentication, User profiles, Portfolio data

Backend Route Structure
Route
Method
Description
Cache TTL
/api/stock/<ticker>
GET
Full stock detail (all metrics)
5 min
/api/stock/<ticker>/chart?range=1M
GET
Historical OHLCV for chart
2 min
/api/stock/<ticker>/eps
GET
Quarterly EPS history
5 min
/api/stock/<ticker>/volume
GET
90-day volume history
2 min
/api/stocks/movers
GET
Top gainers + losers
2 min
/api/stocks/trending
GET
Trending stocks by volume ratio
2 min
/api/market/indices
GET
S&P 500, NASDAQ, DOW
1 min
/api/market/sectors
GET
Sector performance via ETF proxies
1 min
/api/search?q=apple
GET
Autocomplete results
Instant
/api/search/index
GET
Full stock universe list
1 hour
/api/health
GET
Backend health check
None


Data Flow — Stock Detail Page
User searches "AAPL" → React calls GET /api/search?q=nvda
Flask searches the 300+ stock index → returns AAPL with name and sector
User clicks AAPL → React calls GET /api/stock/AAPL and GET /api/stock/AAPL/chart?range=1W
Flask fetches from yfinance, normalises the data, caches it
React renders the price, all 10 metrics, and a canvas line chart
User hovers over chart → JavaScript reads canvas pixel position, maps to closest data point, shows tooltip
User clicks the P/E Ratio ? bubble → modal opens showing the zone scale diagram and plain-English explanation

9. Tech Stack
Why We Chose Each Technology
Technology
Role
Rationale
React.js
Frontend framework
Component-based architecture makes it easy to build reusable metric cards and modals. Both team members have JavaScript experience.
CSS (custom)
Styling
Full control over the unique visual design without the constraints of a component library. Allows the green-on-white design system.
Python + Flask
Backend API
Python is our strongest shared language. Flask is lightweight and perfect for a data-serving API.
yfinance
Stock data
Free, no API key required, comprehensive coverage of global stocks and ETFs.
Firebase Authentication
User auth
Handles all auth complexity out of the box. Free tier easily covers our usage.
Firebase Firestore
Portfolio persistence
NoSQL structure maps naturally to user portfolio documents. Tight integration with Firebase Auth.
HTML5 Canvas
Price chart rendering
Full control over chart appearance without adding a heavy charting library.
GitHub
Version control
Industry standard. Both team members use GitHub regularly.
Vercel
Frontend deployment
Zero-config deployment for React apps. Free tier sufficient.
Render / Railway
Backend deployment
Simple Python/Flask deployment. Free tier with auto-sleep suitable for demo use.


Technologies Considered but Not Chosen
Technology
Reason Not Chosen
Recharts / Chart.js
Adds bundle weight; we wanted full control over chart visuals and hover behaviour
Next.js
Overkill for our use case; we don't need SSR for this MVP
PostgreSQL
Firebase covers our data storage needs without requiring a separate database service
Alpha Vantage / Finnhub
API key required; yfinance is free and equally comprehensive for our purposes


Development Plan & Timeline
Milestone Overview
Milestone
Date
Focus
Milestone 1
2 June 2026
Technical Proof of Concept
Milestone 2
28 June 2026
Core Feature Prototype
Milestone 3
26 July 2026
Full MVP with Extensions


Milestone 1 — Technical Proof of Concept (by 2 June 2026)
Goal: Prove that the core tech stack works end-to-end. A user should be able to search for a stock, see a real chart, and read metric explanations.

Task
Owner
Target Date
Status
React project setup with routing
Rann
Week 1
Done
Flask backend setup with CORS
Jared
Week 1
Done
yfinance integration — stock detail endpoint
Jared
Week 2
Done
yfinance integration — chart data endpoint
Jared
Week 2
Done
In-memory cache layer
Jared
Week 2
Done
Search endpoint with stock universe
Jared
Week 2
Done
Dashboard UI layout
Rann
Week 2
Done
Search page UI
Rann
Week 2
Done
Stock detail page with canvas chart
Rann
Week 3
Done
Hover crosshair and tooltip on chart
Rann
Week 3
Done
Key Metrics panel with ? bubbles
Rann
Week 3
Done
Learn page — 10 metric cards with visuals
Rann
Week 3–4
Done
Metric modal with full explanation
Rann
Week 4
Done
Firebase Authentication setup
Rann
Week 4
Done
Portfolio prototype page (dummy data)
Rann
Week 4
Done
Market overview strip (indices)
Jared
Week 4
Done
Top movers endpoint
Jared
Week 4
Done
Sector browser with live data
Jared
Week 4
Done
Responsive layout (desktop + mobile)
Rann
Week 4
Done


Milestone 2 — Core Feature Prototype (by 28 June 2026)
Goal: The app is a working product. Users can buy/sell stocks with their virtual portfolio, view real metric explanations, and use the historical simulator.

Task
Owner
Target Date
Portfolio buy/sell functionality
Jared
Week 5
Firebase Firestore — portfolio persistence
Jared
Week 5
Portfolio real-time value calculation
Jared
Week 5–6
Transaction history log
Jared
Week 6
Historical simulator — date selection UI
Rann
Week 5
Historical simulator — fast-forward logic
Jared
Week 6
Simulator results page with P&L breakdown
Rann + Jared
Week 7
Learn page — Basics tab (4 beginner guides)
Rann
Week 6
Market news integration (optional)
Jared
Week 7
Live indices from backend (not hardcoded)
Jared
Week 5
Full ETF universe expansion
Jared
Week 5
UI polish and bug fixes from M1 feedback
Rann
Week 7–8
User testing (5 NUS students)
Both
Week 8


Milestone 3 — Full MVP (by 26 July 2026)
Goal: All planned features complete, tested, and deployed. AI assistant, quiz/leaderboard, and full simulator working.

Task
Owner
Target Date
AI Assistant — Gemini API integration
Jared
Week 9
AI Assistant — chat UI
Rann
Week 9
AI Assistant — context-aware stock explanations
Jared
Week 10
Quiz system — 6 topic categories, 5 questions each
Rann
Week 9–10
Quiz scoring and Firebase persistence
Jared
Week 10
Leaderboard page with top 20 users
Rann
Week 10
Full user testing (10+ users)
Both
Week 11
Bug fixes from user testing
Both
Week 11–12
Deployment — frontend to Vercel
Rann
Week 11
Deployment — backend to Render
Jared
Week 11
README and developer documentation
Both
Week 12
User guide
Rann
Week 12
Final code review and cleanup
Both
Week 12



MS 
Tasks 
Description 
In-Charge 
Date
1
Map and character design
Design of sprite sheets 
Man
15 - 22 May
Tilemap 
Man
Preliminary 
research into 
gameplay 
implementation
Familiarise with Unity's features, elements of turn-based strategy RPG, relevant algorithms
Maxx 
Man
10 - 18 May
Movement 
mechanics
Tile object system 
Maxx 
18 - 21 May
Movement algorithms allowing variable tile movement cost
Maxx 
23 - 25May
Battle Mechanics
Character stats 
Man
23 - 25 May
Battle interaction 
Man
Turn and Event manager
Using queues to build a basic FIFO turn system where turn order is fixed. Integrating everything together.
Maxx 
25- 31 May
Evaluation Milestone 1: 
- Ideation 
- Proof-of-concept: 
- 1 map with 2 characters per team able to perform basic interactions (Movement, Attack, End Turn) 
- Movement mechanics with variable movement cost 
- Basic turn scheduler
1 June
2
User Interface
Battle UI - pop up menu, character stats, memory fragment capture points
Man
Week 5 - Week 6..5 (1 June - 10 June)
Menu screen 
Man
Character management inventory 
Man
Enemy AI
Research and implementation of Enemy AI that is able to balance capture, defeat and self-preservation objectives
Maxx
Character classes (4 classes)
Creation of 4 character classes 
Man
Week 6.5 - Week 7.5 (11 June - 17 June)
Creation of abilities - 2 abilities per class
Man 
Maxx
Integration of character stats and abilities into battle system
Maxx





2 playable stages 
Map design 
Man
Week 7.5 - Week 8.5 (18 June - 24 June)
Save game 
Ability to save and load game 
Maxx
Integration of 
systems
Putting everything together and refactoring code
Maxx 
Man
Testing and 
debugging
Preparation for Milestone 2 
* Will move to Milestone 3 tasks if progress is good
Maxx 
Man
Week 8.5 (2nd half) (25 June - 28 June)
Evaluation Milestone 2: First Working Prototype 
- 2 playable levels 
- 4 characters per team with different classes - differing in stats and abilities 
- Improved battle UI 
- Menu Screen 
- Character management inventory 
- Save game 
- Enemy AI
29 June
3
Equipment
Creation of equipment (armor and weapons) - sprites and stats
Man
Week 9 - Week 11 (30 June - 12 July)
Equipment Inventory 
Man
Integration of weapon system into character stats
Maxx
Character leveling system
Levelling System 
Maxx
Character 
Collection System
Working on how new character units will be obtained
Man
6 Levels
Finish building the rest of the levels needed for MVP
Man 
Week 12 
(13 July - 19 July)
Dialogue 
Dialogue that drives plot 
Maxx
User Interface
Creating Map and level navigation 
Man
Week 13 
(20 July - 26 July)
Improving user experience via camera movement
Man
Sound 
In-game music and sound effects 
Maxx



Evaluation Milestone 3: MVP 
- Enemy AI 
- 5 levels 
- Equipment System 
- Storyline, dialogue 
- Sound 
- World map
27 July
4
Refinement of enemy AI
Building deeper decision trees 
Maxx
Week 13 - 14 
(3 Aug - 16 Aug) 
Additional Battle Elements
Minigames, expansion of abilities and characters, cutscenes
Man
Refinement
Progression system (levelling up, increasing difficulty)
Maxx 
Man
Week 15 - 16 
(17 Aug - 25 Aug)
Testing and debugging
Improving Story
Playtesting, Feedback, 
User Experience
Splashdown: MVP with Add-ons 
26 August




12. Software Engineering Practices
Version Control
All code is managed in a shared GitHub repository: github.com/jaredseezw/StockSense

We follow a feature-branch workflow:
main — stable, always deployable
feature/<name> — individual features developed in isolation
Pull requests required before merging to main
Commit messages follow: [type]: description (e.g. feat: add hover crosshair to chart)

Agile Development
We use GitHub Issues to track tasks and bugs. Milestones in GitHub correspond to Orbital evaluation dates. Weekly check-ins every Sunday evening to review progress and reprioritise.

Separation of Concerns
The React frontend and Flask backend communicate exclusively via a RESTful JSON API. No business logic sits in the frontend. The frontend only renders; all data calculation and formatting happens in the backend.

Caching Strategy
The backend uses a custom in-memory TTL cache (cache.py) to avoid hammering the Yahoo Finance API. Cache TTLs are tuned per data type:
Data Type
TTL
Rationale
Live price/quote
60 seconds
Changes every minute in market hours
Fundamentals/metrics
5 minutes
Changes rarely
Chart data
2 minutes
New candle every few minutes
Top movers
2 minutes
Refresh regularly during market hours
Market indices
60 seconds
Frequent updates needed for dashboard strip
Search index
1 hour
Ticker universe is static


Error Handling
All yfinance calls wrapped in try/except with graceful fallbacks
Frontend shows loading states and error messages instead of crashing
Search returns static fallback list if yfinance is unavailable
Chart shows a clear "no data available" message for intraday data outside market hours

Responsive Design
CSS Flexbox and Grid used throughout
Sidebar collapses to a top bar on screens below 1100px
Chart height reduces on mobile
All grids switch to single-column on small screens

Code Documentation
All Flask routes documented with docstrings explaining endpoint purpose, parameters, and response format
React components have prop descriptions via comments
cache.py, fetcher.py — all functions documented


Proof-of-Concept
Refer to video demonstration:

Work Log
Refer to attached spreadsheet:
https://docs.google.com/spreadsheets/d/1ycdUaej5MjVTyn4l81Pqb9ugiVS1xB58NhhGEVgBCW4/edit?usp=sharing

