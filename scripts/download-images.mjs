import { writeFile, mkdir } from "node:fs/promises";
const photos = {
  hero: "photo-1536237482339-e8b36fe0bc63",
  "atlas-road": "photo-1536237482339-e8b36fe0bc63",
  marrakech: "photo-1597212618440-806262de4f6b",
  essaouira: "photo-1655297627275-59e370c4c92a",
  "essaouira-coast": "photo-1655297627275-59e370c4c92a",
  duster: "photo-1533473359331-0135ef1b58bf",
  clio: "photo-1549317661-bd32c8ce0db2",
  tiguan: "photo-1519641471654-76ce0107ad1b",
  fiat: "photo-1494976388531-d1058494cdd8",
  driver: "photo-1449965408869-eaa3f722e40d",
  boat: "photo-1544551763-46a013bb70d5",
  surf: "photo-1502680390469-be75c86b636f",
};
await mkdir("public/images", { recursive: true });
await Promise.all(
  Object.entries(photos).map(async ([name, id]) => {
    try {
      const response = await fetch(
        `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=85`,
      );
      if (!response.ok) throw new Error(`${response.status}`);
      await writeFile(
        `public/images/${name}.jpg`,
        Buffer.from(await response.arrayBuffer()),
      );
      console.log(`${name}: saved`);
    } catch (e) {
      console.log(`${name}: ${e.message}`);
    }
  }),
);
