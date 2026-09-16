import "dotenv/config";
import { createApp } from "./app.js";
const app = await createApp();
const port = Number(process.env.PORT || 4000);
app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `SwasthyaSetu API ready at http://${process.env.HOST || "127.0.0.1"}:${port}`,
  ),
);
