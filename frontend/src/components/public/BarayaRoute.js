import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBaraya } from '../../context/BarayaAuthContext';
import { LoadingState } from '../shared/LoadingState';

/** Client-side convenience guard — backend authorization is always enforced too. */
export const BarayaRoute = ({ children }) => {
  const { customer, loading } = useBaraya();
  const location = useLocation();

  if (loading) {
    return (
      <div className="als-container py-16">
        <LoadingState variant="text" testId="baraya-route-loading" />
      </div>
    );
  }
  if (!customer) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
};

export default BarayaRoute;
