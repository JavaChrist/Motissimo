import { readFileSync, writeFileSync } from "fs";

const sizes = [16, 32, 48];
const images = sizes.map((size) => readFileSync(`scripts/favicon-${size}.png`));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

let offset = 6 + images.length * 16;
const entries = images.map((png, index) => {
  const entry = Buffer.alloc(16);
  const size = sizes[index] === 256 ? 0 : sizes[index];
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += png.length;
  return entry;
});

const ico = Buffer.concat([header, ...entries, ...images]);
for (const path of ["src/app/favicon.ico", "public/favicon.ico", "public/icons/favicon.ico"]) {
  writeFileSync(path, ico);
}
writeFileSync("public/favicon-32.png", images[1]);
console.log("ico", ico.length);
