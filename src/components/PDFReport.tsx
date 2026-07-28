import React from 'react';

interface PDFReportProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}

export default function PDFReport({ title, subtitle, children, onClose }: PDFReportProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pdf-print-overlay">
      <div className="pdf-print-actions">
        <button className="btn btn-primary" onClick={handlePrint}>🖨️ طباعة / حفظ كـ PDF</button>
        <button className="btn btn-ghost" onClick={onClose}>إغلاق</button>
      </div>
      
      <div className="pdf-print-container" dir="rtl">
        {/* Header */}
        <div className="pdf-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Sky Academy 🌤️</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>أكاديمية سكاي التعليمية</p>
          </div>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '20px', margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>{subtitle}</p>}
            <p style={{ margin: 0, fontSize: '12px', color: '#777', marginTop: '4px' }}>تاريخ الطباعة: {new Date().toLocaleString('ar-EG')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="pdf-content">
          {children}
        </div>

        {/* Footer */}
        <div className="pdf-footer" style={{ marginTop: '40px', paddingTop: '10px', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '12px', color: '#777' }}>
          نظام إدارة أكاديمية سكاي — طُبع بواسطة النظام الآلي
        </div>
      </div>
    </div>
  );
}
