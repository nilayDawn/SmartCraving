# AUTH IMPROVEMENT

## PROBLEM 1: Extreme Tail Latency on Signup & Login (CPU Event Loop Starvation)
- **What the problem was**: 
  The backend was using `bcryptjs`, which is written in pure JavaScript and runs on Node.js's single main thread. It was also configured with a high salt round of `12`. Each password hash took ~240 ms of blocking CPU time. Under 50 concurrent users, requests queued up behind each other, causing `signup` p95 latency to skyrocket to 25 seconds and `login` to 14.4 seconds.
- **Solution applied**:
  1. Replaced pure JavaScript `bcryptjs` with native C++ `bcrypt` ([backend/src/modules/auth/user.model.js](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/src/modules/auth/user.model.js#L3)). Native bcrypt offloads hashing onto background worker threads outside the main JavaScript event loop.
  2. Reduced bcrypt salt rounds from `12` down to `10` ([backend/src/modules/auth/user.model.js](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/src/modules/auth/user.model.js#L68)). Cost 10 is the industry-standard balance recommended by OWASP; it cuts hashing compute time by 75% while keeping password security robust.

---

## PROBLEM 2: Single Worker Threadpool Bottleneck (Default UV_THREADPOOL_SIZE = 4)
- **What the problem was**: 
  Node.js defaults its internal libuv threadpool to only 4 threads. Even with asynchronous C++ crypto operations, 50 concurrent virtual users would still have to wait in line 4 at a time.
- **Solution applied**:
  Expanded the libuv threadpool size to `16` at the very entrypoint of the application in [backend/server.js](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/server.js#L10) (`process.env.UV_THREADPOOL_SIZE = "16"`). This allows up to 16 concurrent cryptographic hashing tasks to run simultaneously in parallel.

---

## PROBLEM 3: Single CPU Core Underutilization on a Multi-Core Machine
- **What the problem was**: 
  The machine has 16 CPU cores, but Node.js was running as a single process. 15 CPU cores were sitting completely idle while 1 core was pinned at 100% CPU during load tests.
- **Solution applied**:
  Added built-in Node.js cluster support to [backend/server.js](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/server.js#L17-L44) and a dedicated `"cluster"` script in [backend/package.json](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/package.json#L11) (`npm run cluster`). When running in cluster mode, the primary process forks worker processes across all available CPU cores, distributing incoming HTTP traffic evenly.

---

## PROBLEM 4: Cascading Head-of-Line Blocking on Lightweight Endpoints (`/me` and `/logout`)
- **What the problem was**: 
  Simple endpoints like `GET /users/logout` (which only clears a cookie) and `GET /users/me` (which reads the profile) took 2.6 to 4.7 seconds because they were stuck waiting behind the slow password hashing operations in the single thread. Additionally, `GET /users/me` was making a repetitive remote database query to MongoDB Atlas on every single request.
- **Solution applied**:
  1. Offloading password hashing to native background threads resolved the event loop head-of-line blocking so `/logout` and other I/O routes respond immediately.
  2. Implemented user session caching in the `protect` middleware ([backend/src/core/middlewares/auth.middleware.js](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/src/core/middlewares/auth.middleware.js#L23-L44)) using the in-memory cache provider (`user:session:<id>` with a 60-second TTL). This avoids repeated roundtrips across the internet to MongoDB Atlas for profile and protected requests.
  3. Added automatic cache invalidation in [backend/src/modules/auth/auth.service.js](file:///home/nilaydawn/Desktop/WebDevProj/FoodProject/backend/src/modules/auth/auth.service.js) so any profile or password update immediately flushes the cached session.
