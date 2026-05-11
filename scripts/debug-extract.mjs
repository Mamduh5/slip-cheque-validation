import { extractFieldsFromOcrText } from "../lib/slip-image-read.ts";

const sampleOcr = `
โอ น เง ิ น ส ํ า เ ร ็ จ
6 พ . ค . 69 17:52 น . IK+
น . ส . ณั ฐ ฐ า พ ร ว
ธ . ก ส ิ ก ร ไท ย
ง /
น . ส . ธั ญ ญ า ร ั ต น ์ ว ี ร ะ จ ิ ต ต ์
ธ . ก ส ิ ก ร ไท ย
เล ข ท ี ่ ร า ย ก า ร :
016126175244BTF00250 [=]: = [=]
จ ํ า น ว น : ๆ ระ ไช้
73.00 บ า ท TXT, rae
ค ่ า ธ ร ร ม เ น ี ย ม : [=] i
0.00 บ า ท ส แก น ต ร ว จ ส อ บ ส ล ิ ป
`;

const fields = extractFieldsFromOcrText(sampleOcr);
console.log(JSON.stringify(fields, null, 2));
