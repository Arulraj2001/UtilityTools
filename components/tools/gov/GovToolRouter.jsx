import React from 'react';
import SscPhotoResizer from './SscPhotoResizer';
import SscSignatureResizer from './SscSignatureResizer';
import BankSignatureResizer from './BankSignatureResizer';
import RailwayPhotoResizer from './RailwayPhotoResizer';
import BankExamPhotoTool from './BankExamPhotoTool';
import PassportSizePhotoMaker from './PassportSizePhotoMaker';
import PhotoKbReducer from './PhotoKbReducer';
import SignatureMaker from './SignatureMaker';
import ExamPhotoCropper from './ExamPhotoCropper';
import PdfSizeReducer from './PdfSizeReducer';
import ExamDocumentPdfCompressor from './ExamDocumentPdfCompressor';
import ImageToExamPdf from './ImageToExamPdf';
import PdfPageExtractor from './PdfPageExtractor';
import PdfMerger from './PdfMerger';
import PdfToImage from './PdfToImage';
import DocumentScanner from './DocumentScanner';

const GOV_TOOL_MAP = {
  'ssc-photo-resizer': SscPhotoResizer,
  'ssc-signature-resizer': SscSignatureResizer,
  'bank-signature-resizer': BankSignatureResizer,
  'railway-photo-resizer': RailwayPhotoResizer,
  'bank-exam-photo-tool': BankExamPhotoTool,
  'passport-size-photo-maker': PassportSizePhotoMaker,
  'photo-kb-reducer': PhotoKbReducer,
  'signature-maker': SignatureMaker,
  'exam-photo-cropper': ExamPhotoCropper,
  'pdf-size-reducer': PdfSizeReducer,
  'exam-document-pdf-compressor': ExamDocumentPdfCompressor,
  'image-to-exam-pdf': ImageToExamPdf,
  'pdf-page-extractor': PdfPageExtractor,
  'pdf-merger': PdfMerger,
  'pdf-to-image': PdfToImage,
  'document-scanner': DocumentScanner,
};

export default function GovToolRouter({ tool }) {
  const Component = GOV_TOOL_MAP[tool?.slug];
  if (!Component) return null;
  return <Component tool={tool} />;
}

export const GOV_TOOL_SLUGS = Object.keys(GOV_TOOL_MAP);