import { migrate } from "../src/server/store";
await migrate();
console.log("Database schema is ready.");
process.exit(0);
