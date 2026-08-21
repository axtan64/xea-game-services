# 📂 Shared

This folder contains shared code and resources used across multiple services in the Untitled Mining Game project. It is a local package that can be installed as a dependency in any service that needs to use the shared functionality:

```bash
cd services/xyz
npm install ../../shared/database
```

## 🧩 Contents

- `database/`: Contains a consistent prisma client across all services
- `logger/`: A shared logging utility for consistent logging across services