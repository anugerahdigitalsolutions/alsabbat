import React from 'react';
import LegalDocumentPage from './LegalDocumentPage';
import { TERMS } from '../../lib/legalContent';

export default function TermsPage() {
  return <LegalDocumentPage doc={TERMS} path="/syarat-ketentuan" testId="page-terms" />;
}
