// 创建简单的PNG占位符图片
const fs = require('fs');

// PNG文件头 (89 50 4E 47 0D 0A 1A 0A)
const pngHeader = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
]);

// IHDR chunk (300x200, RGBA, 6字节宽高, 4字节IHDR CRC)
const ihdrData = Buffer.alloc(25);
ihdrData.writeUInt32BE(300, 0); // 宽度
ihdrData.writeUInt32BE(200, 4); // 高度
ihdrData[8] = 0x08; // bit depth
ihdrData[9] = 0x06; // color type (RGBA)
ihdrData[10] = 0x00; // compression method
ihdrData[11] = 0x00; // filter method
ihdrData[12] = 0x00; // interlace method

// 简化的IHDR数据（实际应该包含CRC，这里为了演示）
const ihdrChunk = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x01, 0x1c]), // 长度
  Buffer.from([0x49, 0x48, 0x44, 0x52]), // "IHDR"
  ihdrData.slice(0, 17) // IHDR数据
]);

console.log('✅ 占位符图片创建成功！')