import React from 'react';
import LegalDocumentPage from './LegalDocumentPage';
import { PRIVACY } from '../../lib/legalContent';

export default function PrivacyPolicyPage() {
  return <LegalDocumentPage doc={PRIVACY} path="/kebijakan-privasi" testId="page-privacy" />;
}
