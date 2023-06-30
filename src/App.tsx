import React, { useState } from "react";
import {
  DetectDocumentTextCommand,
  TextractClient,
} from "@aws-sdk/client-textract";
import { Buffer } from "buffer";
globalThis.Buffer = Buffer;
import { PDFDocument } from "pdf-lib";
import "./App.css";

function App() {
  const [src, setSrc] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  console.log(src, "src");
  const [type, setType] = useState("");
  const [data, setData] = useState([]);

  function readFileAsync(file: any) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      // reader.readAsArrayBuffer(file);
      reader.readAsDataURL(file);
    });
  }

  const onSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function (upload: ProgressEvent<FileReader>) {
      setPreview(upload?.target?.result as string);
    };
    reader.readAsDataURL(file);
    const pdfArrayBuffer = await readFileAsync(file);
    splitPDF(pdfArrayBuffer);
  };

  const splitPDF = async (pdfFilePath: any) => {
    const readPdf = await PDFDocument.load(pdfFilePath);
    const { length } = readPdf.getPages();

    for (let i = 0, n = length - length + 1; i < n; i += 1) {
      const writePdf = await PDFDocument.create();
      const [page] = await writePdf.copyPages(readPdf, [i]);
      writePdf.addPage(page);
      const bytes = await writePdf.save();
      const u8 = new Uint8Array(bytes);
      var b64 = Buffer.from(u8).toString('base64');
      setSrc(b64 as any);
    }
  };

  const onRunOCR = async () => {
    const client = new TextractClient({
      region: "ap-south-1",
      credentials: {
        accessKeyId: import.meta.env.VITE_ACCESS_KEY,
        secretAccessKey: import.meta.env.VITE_SECRET_KEY,
      },
    });
    // convert image to byte Uint8Array base 64
    const blob = Buffer.from(src, "base64");
    console.log(blob, "blob")
    const params = {
      Document: { Bytes: blob, },
      FeatureTypes: ["TABLES", "FORMS"],
    };
    const command = new DetectDocumentTextCommand(params);
    try {
      if (type === 'AWS') {
        setLoading(true);
        const data = await client.send(command);
        if (data?.Blocks) {
          setLoading(false);
          setData(data.Blocks as []);
        }
      }
    } catch (error) {
      setLoading(false);
      console.log("err", error);
    }
  };

  return (
    <div className="App">
      <h4 className="mb-2 text-center mt-2">Handwriting Text Extraction OCR</h4>
      <div className="flex justify-content-center">
        <input
          style={{ width: '30%' }}
          className="inputfile form-control"
          id="file"
          type="file"
          name="file"
          onChange={onSelectFile}
        />
      </div>
      <div className="flex justify-content-center mt-2"
        onChange={(e: any) => setType(e.target.value)}>
        <input className="radio" type="radio" value="AWS" name="type" /> AWS
        <input className="radio" type="radio" value="MICROSOFT" name="type" /> Microsoft
        <input className="radio" type="radio" value="GOOGLE" name="type" /> Google
      </div>
      <div className="flex justify-content-center">
        <button onClick={onRunOCR} style={{ margin: "10px" }} className="btn btn-primary">
          SUBMIT
        </button>
      </div>

      <div className="flex justify-content-between">
        <div style={{ width: '50%' }}>
          <h5 className="text-center border"> PDF/Image </h5>
          <object width="100%" height="490" data={preview} type="application/pdf">   </object>
        </div>

        <div style={{ borderLeft: "1px solid #eee", width: '50%', padding: '0px 10px', height: '490px', overflowY: 'scroll' }}>
          <h5 className="text-center border"> Results </h5>
          {!!loading && (<h4 className="text-center"> Loading... </h4>)}
          {data?.map((item: { Text: string; BlockType: string; }, index) => {
            return (
              <div key={index} className="">
                {item.Text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
