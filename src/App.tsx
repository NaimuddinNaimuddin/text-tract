import React, { useState, useEffect } from "react";
import {
  DetectDocumentTextCommand,
  TextractClient,
} from "@aws-sdk/client-textract";
import { Buffer } from "buffer";
globalThis.Buffer = Buffer;
import { PDFDocument } from "pdf-lib";
import "./App.css";
import axios from "axios";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  list,
} from "firebase/storage";
import { storage } from "./firebase";
import { v4 } from "uuid";
import { readFileAsync } from "./helpers.js";
import logo from "./assets/snak.png";

function App() {
  const BASE_URL = import.meta.env.VITE_BU;
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | any>(undefined);
  const [fileType, setFileType] = useState("");
  const [src, setSrc] = useState("");
  const [length, setLength] = useState(1);
  const [type, setType] = useState("");

  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [data, setData] = useState([]);
  const [dataMicrosoft, setDataMicrosoft] = useState([]);
  const [responses, setResponses] = useState([]);

  function listFiles() {
    const imagesListRef = ref(storage, "results/");
    listAll(imagesListRef).then((response: any) => {
      response.items.forEach((item: any) => {
        if (item._location.path_ == `results/output-1-to-${length}.json`) {
          getDownloadURL(item).then((url: any) => {
            fetch(url)
              .then(res => res.json())
              .then(result => {
                setResponses(result.responses);
              })
          });
        }
      });
    });
  }

  const onSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    const file: any = e.target.files[0];
    setFileType(file.type);
    setFile(file);
    const reader = new FileReader();
    reader.onload = function (upload: ProgressEvent<FileReader>) {
      setPreview(upload?.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (file.type === 'application/pdf') {
      const pdfArrayBuffer = await readFileAsync(file);
      splitPDF(pdfArrayBuffer);
    }
  };

  const splitPDF = async (pdfFilePath: any) => {
    const readPdf = await PDFDocument.load(pdfFilePath);
    const { length } = readPdf.getPages();
    setLength(length);

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
    if (!type) {
      alert('Please Select OCR.');
      return;
    }
    if (!fileType) {
      alert('Please Select File.');
      return;
    }

    try {
      setLoading(true);
      setData([]);
      setText('');
      setResponses([]);
      setDataMicrosoft([]);

      if (type === 'AWS') {
        const client = new TextractClient({
          region: import.meta.env.VITE_REGION_AWS,
          credentials: {
            accessKeyId: import.meta.env.VITE_ACCESS_KEY_AWS,
            secretAccessKey: import.meta.env.VITE_SECRET_KEY_AWS,
          },
        });
        // convert image to byte Uint8Array base 64
        let blob: any;
        if (fileType === 'application/pdf') {
          blob = Buffer.from(src, "base64");
        }
        if (fileType.indexOf('image') !== -1) {
          blob = Buffer.from(preview, "base64");
        }
        const params = {
          Document: { Bytes: blob, },
          FeatureTypes: ["TABLES", "FORMS"],
        };
        const command = new DetectDocumentTextCommand(params);
        const data = await client.send(command);
        if (data?.Blocks) {
          setLoading(false);
          setData(data.Blocks as []);
        }
      }

      if (type === 'GOOGLE' && fileType === 'application/pdf') {
        if (file == null) return;
        const imageRef = ref(storage, `images/${file.name + v4()}`);
        uploadBytes(imageRef, file).then((snapshot) => {
          getDownloadURL(snapshot.ref).then((url) => {
            const _url = BASE_URL + '/google/pdf';
            axios.post(_url, { fileName: snapshot.metadata.fullPath }).then(result => {
              setLoading(false);
              if (result.data.code == 200) {
                listFiles();
              }
              if (result.data.code == 500) {
                alert('Something went wrong.')
              }
            })
          });
        });
      }

      if (type === 'GOOGLE' && fileType !== 'application/pdf') {
        const _url = BASE_URL + '/google/image';
        const form = new FormData();
        form.append('image', file);
        axios.post(_url, form).then(result => {
          setLoading(false);
          if (result.data.code == 200) {
            setText(result.data.data.text);
          }
          if (result.data.code == 500) {
            alert('Something went wrong.');
          }
        })
      }

      if (type === 'MICROSOFT') {
        const _url = BASE_URL + '/microsoft/ocr';
        const printedTextSampleURL = 'https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/ComputerVision/Images/printed_text.jpg';
        const pdfUrl = 'https://snakconsultancy.com/images/Prescriptioscanned.pdf';

        const result = await axios.post(_url, { fileUrl: pdfUrl });
        setLoading(false);
        setDataMicrosoft(result.data.data);
      }

    } catch (error) {
      setLoading(false);
      alert('Something went wrong.');
    }
  };

  return (
    <div className="App">
      <div className="text-center fs-4 fw-bold">
        <img className="logo"
          src={logo}
          alt="LOGO"
        />
        Handwriting Text Extraction OCR
      </div>
      <div className="flex justify-content-center mt-2 mb-1 fst-italic fw-normal"
        onChange={(e: any) => setType(e.target.value)}>
        Select OCR :
        <input className="radio" type="radio" value="AWS" name="type" /> AWS
        <input className="radio" type="radio" value="MICROSOFT" name="type" /> Microsoft
        <input className="radio" type="radio" value="GOOGLE" name="type" /> Google
      </div>
      <div className="flex justify-content-center mb-3">
        <input
          style={{ width: '26%' }}
          className="inputfile form-control br-file"
          id="file"
          type="file"
          name="file"
          onChange={onSelectFile}
        />
        <button onClick={onRunOCR} className="btn btn-primary ml-2 br-btn">
          SUBMIT
        </button>
      </div>
      <div className="flex justify-content-between">
        <div style={{ width: '50%' }}>
          <div className="text-center bg-e pb-1 text-primary fs-5"> Uploaded Document </div>
          {fileType.indexOf('image') !== -1 ?
            <img width="100%" src={preview} alt="PREVIEW" /> :
            <object width="100%" height="620" data={preview} type="application/pdf">
            </object>
          }
        </div>

        <div className="ocr-results-cont">
          <div className="text-center bg-e pb-1 text-primary fs-5 "> OCR Results </div>
          <div className="p-3">
            {!!loading && (<h4 className="text-center"> Loading... </h4>)}
            {data?.map((item: { Text: string; BlockType: string; }, index) => {
              return (
                <div key={index} className="">
                  {item.Text}
                </div>
              );
            })}
            <p style={{ whiteSpace: 'pre-wrap' }}>{text}</p>
            {
              responses &&
              responses.length > 0 &&
              responses.map((response: any, index: any) => {
                return (
                  <div id={index} style={{ whiteSpace: 'pre-wrap' }}>
                    {response.fullTextAnnotation.text}
                  </div>
                )
              })
            }
            {
              dataMicrosoft &&
              dataMicrosoft.length > 0 &&
              dataMicrosoft.map((page: any) => {
                return (
                  page && page.lines &&
                  page.lines.map((line: any, lineIndex: any) => {
                    return (
                      <div key={lineIndex} style={{ whiteSpace: 'pre-wrap' }}>
                        {line.text}
                      </div>
                    )
                  }))
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
