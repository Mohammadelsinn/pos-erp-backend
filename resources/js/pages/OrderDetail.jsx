import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PageWrapper from '../components/PageWrapper';
import Button from '../components/Button';
import Modal from '../components/Modal';
import {
    ArrowLeft,
    Calendar,
    User,
    Building2,
    CreditCard,
    ShoppingBag,
    Printer,
    Download,
    XCircle,
    Copy,
    Check,
    AlertTriangle,
    Tag,
    Clock,
    DollarSign,
    Eye
} from 'lucide-react';

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    // Actions states
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
    const [cancelConfirmOrder, setCancelConfirmOrder] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Invoice Preview states
    const [invoiceData, setInvoiceData] = useState(null);
    const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
    const [showInvoicePreview, setShowInvoicePreview] = useState(false);

    const handleOpenInvoicePreview = async () => {
        setShowInvoicePreview(true);
        if (invoiceData) return; // already loaded
        
        setIsLoadingInvoice(true);
        try {
            const response = await axios.get(`/api/orders/${id}/invoice`);
            setInvoiceData(response.data);
        } catch (err) {
            console.error("Failed to load invoice preview data:", err);
            alert("Failed to load invoice preview.");
        } finally {
            setIsLoadingInvoice(false);
        }
    };

    const fetchOrderDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/api/orders/${id}`);
            setOrder(response.data);
        } catch (err) {
            console.error("Failed to load order details:", err);
            setError(err.response?.data?.message || "Failed to fetch order details. It may not exist or you do not have permission.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchOrderDetails();
        }
    }, [id]);

    const handleCopyOrderNumber = () => {
        if (!order?.order_number) return;
        navigator.clipboard.writeText(order.order_number);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePaymentStatusChange = async (newStatus) => {
        if (!order) return;
        setIsUpdatingPayment(true);
        try {
            const response = await axios.patch(`/api/orders/${order.id}/payment-status`, {
                payment_status: newStatus
            });
            setOrder(prev => ({
                ...prev,
                payment_status: response.data.payment_status
            }));
        } catch (err) {
            console.error("Failed to update payment status:", err);
            alert(err.response?.data?.message || "Failed to update payment status.");
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!order) return;
        setIsCancelling(true);
        try {
            const response = await axios.post(`/api/pos/orders/${order.id}/cancel`);
            if (response.data.success) {
                setOrder(prev => ({
                    ...prev,
                    status: 'cancelled'
                }));
                setCancelConfirmOrder(false);
            } else {
                alert(response.data.message || "Failed to cancel the order.");
            }
        } catch (err) {
            console.error("Failed to cancel order:", err);
            alert(err.response?.data?.message || "An error occurred while canceling the order.");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleDownloadInvoice = async () => {
        if (!order) return;
        setIsDownloadingPdf(true);
        try {
            const response = await axios.post(`/api/orders/${order.id}/invoice/pdf`, {}, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `invoice-${order.order_number || order.id}.pdf`;
            link.click();
        } catch (err) {
            console.error("Failed to download invoice PDF:", err);
            alert("Failed to download PDF invoice.");
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handlePrintReceipt = async () => {
        if (!order) return;
        setIsPrinting(true);
        try {
            const response = await axios.get(`/api/orders/${order.id}/receipt`);
            const receiptData = response.data;
            
            // Create a hidden print iframe
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.bottom = '0';
            iframe.style.right = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);
            
            const doc = iframe.contentWindow.document;
            
            doc.write(`
                <html>
                    <head>
                        <title>Receipt ${receiptData.order_number}</title>
                        <style>
                            @page {
                                size: 80mm auto;
                                margin: 0;
                            }
                            body {
                                font-family: 'Courier New', Courier, monospace;
                                width: 72mm;
                                margin: 0 auto;
                                padding: 10px 0;
                                font-size: 11px;
                                color: #000;
                                line-height: 1.4;
                            }
                            .text-center { text-align: center; }
                            .text-right { text-align: right; }
                            .bold { font-weight: bold; }
                            .divider {
                                border-top: 1px dashed #000;
                                margin: 8px 0;
                            }
                            .header {
                                margin-bottom: 12px;
                            }
                            .header h2 {
                                margin: 0 0 4px 0;
                                font-size: 14px;
                            }
                            .header p {
                                margin: 2px 0;
                            }
                            .items-table {
                                width: 100%;
                                border-collapse: collapse;
                            }
                            .items-table th {
                                border-bottom: 1px dashed #000;
                                padding-bottom: 4px;
                                text-align: left;
                            }
                            .items-table td {
                                padding: 4px 0;
                                vertical-align: top;
                            }
                            .totals-table {
                                width: 100%;
                                margin-top: 8px;
                            }
                            .totals-table td {
                                padding: 2px 0;
                            }
                            .footer {
                                margin-top: 15px;
                                font-size: 9px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header text-center">
                            <h2>${receiptData.branch_name || 'System ERP'}</h2>
                            <p>Order: ${receiptData.order_number}</p>
                            <p>Date: ${new Date(receiptData.date).toLocaleString()}</p>
                            <p>Cashier: ${receiptData.cashier_name}</p>
                        </div>
                        <div class="divider"></div>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th class="text-center">Qty</th>
                                    <th class="text-right">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${receiptData.items.map(item => `
                                    <tr>
                                        <td>
                                            ${item.product_name}
                                            ${item.variation_name ? `<br/><small>(${item.variation_name})</small>` : ''}
                                        </td>
                                        <td class="text-center">${item.quantity}</td>
                                        <td class="text-right">$${parseFloat(item.total_price).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="divider"></div>
                        <table class="totals-table">
                            <tr>
                                <td>Subtotal:</td>
                                <td class="text-right">$${parseFloat(receiptData.subtotal).toFixed(2)}</td>
                            </tr>
                            ${parseFloat(receiptData.discount_amount) > 0 ? `
                                <tr>
                                    <td>Discount:</td>
                                    <td class="text-right">-$${parseFloat(receiptData.discount_amount).toFixed(2)}</td>
                                </tr>
                            ` : ''}
                            <tr>
                                <td>Tax:</td>
                                <td class="text-right">$${parseFloat(receiptData.tax_amount).toFixed(2)}</td>
                            </tr>
                            <tr class="bold">
                                <td>Grand Total:</td>
                                <td class="text-right">$${parseFloat(receiptData.grand_total).toFixed(2)}</td>
                            </tr>
                        </table>
                        <div class="divider"></div>
                        <div class="text-center">
                            <p>Payment: ${receiptData.payment_method.toUpperCase().replace('_', ' ')}</p>
                            <p>Customer: ${receiptData.customer?.customer_id ? `ID: ${receiptData.customer.customer_id}` : 'Walk-in'}</p>
                        </div>
                        <div class="divider"></div>
                        <div class="footer text-center">
                            <p>Thank you for your purchase!</p>
                            <p>Powered by System ERP</p>
                        </div>
                        <script>
                            window.onload = function() {
                                window.print();
                                setTimeout(function() {
                                    window.frameElement.remove();
                                }, 100);
                            };
                        </script>
                    </body>
                </html>
            `);
            doc.close();
        } catch (err) {
            console.error("Failed to print receipt:", err);
            alert("Failed to print thermal receipt.");
        } finally {
            setIsPrinting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                        Completed
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-450 border border-rose-500/10">
                        Cancelled
                    </span>
                );
            case 'held':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/10">
                        Held
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
                        {status}
                    </span>
                );
        }
    };

    const renderPaymentStatusBadge = (paymentStatus) => {
        switch (paymentStatus) {
            case 'paid':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                        Paid
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/10">
                        Pending
                    </span>
                );
            case 'refunded':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/10">
                        Refunded
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-450 border border-rose-500/10">
                        Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-400 border border-slate-500/10">
                        {paymentStatus || 'N/A'}
                    </span>
                );
        }
    };

    const renderSourceBadge = (source) => {
        const isPos = source === 'pos';
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                isPos ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10' : 'bg-sky-500/10 text-sky-400 border border-sky-500/10'
            }`}>
                {source || 'pos'}
            </span>
        );
    };

    if (isLoading) {
        return (
            <PageWrapper title="Order Details" subtitle="Loading transaction record...">
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-400 font-semibold">Fetching transaction data...</p>
                </div>
            </PageWrapper>
        );
    }

    if (error || !order) {
        return (
            <PageWrapper title="Order Details" subtitle="Transaction record status">
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 max-w-md mx-auto mt-10">
                    <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
                    <h3 className="text-base font-bold text-slate-205">Failed to load order</h3>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">{error || "The requested transaction record could not be found."}</p>
                    <Link to="/orders">
                        <Button variant="secondary" size="sm" icon={ArrowLeft} className="mt-2 border-slate-800">
                            Back to Ledger
                        </Button>
                    </Link>
                </div>
            </PageWrapper>
        );
    }

    const totalItems = order.items ? order.items.reduce((sum, item) => sum + parseInt(item.quantity || 0), 0) : 0;

    const breadcrumbs = [
        { label: 'Core Operations', path: '/dashboard' },
        { label: 'Order Ledger', path: '/orders' },
        { label: order.order_number || `ID: ${order.id}` }
    ];

    const actionsHeader = (
        <Link to="/orders">
            <Button variant="secondary" size="sm" icon={ArrowLeft} className="border-slate-800 text-slate-300 hover:text-white">
                Back to Ledger
            </Button>
        </Link>
    );

    return (
        <PageWrapper
            title={`Transaction Receipt`}
            subtitle={`Review and manage invoice details for order ${order.order_number || order.id}`}
            breadcrumbs={breadcrumbs}
            actions={actionsHeader}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN: Items, calculations, notes */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Header Card */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-slate-100 tracking-wide">
                                        {order.order_number}
                                    </h3>
                                    <button 
                                        onClick={handleCopyOrderNumber}
                                        className="p-1.5 text-slate-500 hover:text-slate-200 bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
                                        title="Copy Order Number"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs font-semibold">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {formatDate(order.created_at)}
                                    </span>
                                    <span>•</span>
                                    <span>{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {renderSourceBadge(order.source)}
                                {renderStatusBadge(order.status)}
                                {renderPaymentStatusBadge(order.payment_status)}
                            </div>
                        </div>
                    </div>

                    {/* Items table */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-5 border-b border-slate-800/60 flex items-center gap-2 bg-slate-900/60">
                            <ShoppingBag className="w-5 h-5 text-indigo-400" />
                            <h4 className="text-sm font-bold text-slate-200">Purchased Items</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs font-semibold">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                                        <th className="py-3.5 px-5">Product Details</th>
                                        <th className="py-3.5 px-5 text-right">Unit Price</th>
                                        <th className="py-3.5 px-5 text-center">Qty</th>
                                        <th className="py-3.5 px-5 text-right">Discount</th>
                                        <th className="py-3.5 px-5 text-right">Total Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850 text-slate-350">
                                    {order.items && order.items.map((item, idx) => {
                                        const vDetails = item.variation ? [
                                            item.variation.size && `Size: ${item.variation.size}`,
                                            item.variation.color && `Color: ${item.variation.color}`,
                                            item.variation.material && `Material: ${item.variation.material}`
                                        ].filter(Boolean).join(', ') : '';

                                        return (
                                            <tr key={idx} className="hover:bg-slate-955/20 transition-colors">
                                                <td className="py-4 px-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-200">{item.product ? item.product.name : 'Unknown Product'}</span>
                                                        {vDetails && (
                                                            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">{vDetails}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-5 text-right font-mono">${parseFloat(item.unit_price).toFixed(2)}</td>
                                                <td className="py-4 px-5 text-center font-mono text-slate-200">{item.quantity}</td>
                                                <td className="py-4 px-5 text-right font-mono text-rose-450">${parseFloat(item.discount_amount).toFixed(2)}</td>
                                                <td className="py-4 px-5 text-right font-mono text-slate-100">${parseFloat(item.total_price).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Payment Details Card */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                        <div className="border-b border-slate-800/60 pb-3 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-indigo-400" />
                            <h4 className="text-sm font-bold text-slate-200">Payment Details</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850">
                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Payment Method</span>
                                <span className="block mt-1 text-xs font-extrabold text-slate-200 uppercase">
                                    {order.payment_method ? order.payment_method.replace('_', ' ') : 'N/A'}
                                </span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850">
                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Amount Paid</span>
                                <span className="block mt-1 text-xs font-mono font-extrabold text-emerald-450">
                                    ${order.payment_status === 'paid' ? parseFloat(order.total_amount).toFixed(2) : '0.00'}
                                </span>
                            </div>
                            <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850">
                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Outstanding Balance</span>
                                <span className={`block mt-1 text-xs font-mono font-extrabold ${(order.payment_status === 'pending' || order.payment_status === 'failed') ? parseFloat(order.total_amount).toFixed(2) : '0.00'}`}>
                                    ${(order.payment_status === 'pending' || order.payment_status === 'failed') ? parseFloat(order.total_amount).toFixed(2) : '0.00'}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1">
                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Payment Status</span>
                                <div className="pt-0.5">{renderPaymentStatusBadge(order.payment_status)}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Transaction Time</span>
                                <span className="block text-xs font-semibold text-slate-300">
                                    {new Date(order.updated_at).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Comments */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order Notes / Logs</span>
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                            <p className="text-slate-400 text-xs italic leading-relaxed">
                                {order.notes || 'No customer remarks or specific transaction notes logged.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Info summary, payment update, print actions */}
                <div className="space-y-6">

                    {/* Financial Summary Card */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-indigo-400" />
                            Financial Summary
                        </h4>
                        
                        <div className="space-y-3 pt-1">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                <span>Subtotal</span>
                                <span className="font-mono text-slate-200">${parseFloat(order.subtotal).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-semibold text-rose-450">
                                <span>Discounts (-)</span>
                                <span className="font-mono">-${parseFloat(order.discount_amount).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                <span>Tax Amount</span>
                                <span className="font-mono text-slate-200">${parseFloat(order.tax_amount).toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs font-bold text-slate-200">
                                <span>Grand Total</span>
                                <span className="font-mono text-lg text-indigo-400">${parseFloat(order.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Order Origin Details Card */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3">
                            Registry & Logistics
                        </h4>
                        
                        <div className="space-y-4 text-xs font-semibold">
                            {/* Branch details */}
                            <div className="flex gap-3">
                                <Building2 className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Branch / Outlet</span>
                                    <span className="block text-slate-200 font-bold">{order.branch ? order.branch.name : 'Unknown Branch'}</span>
                                    {order.branch?.address && (
                                        <span className="block text-[10px] text-slate-500 leading-normal font-medium">{order.branch.address}</span>
                                    )}
                                </div>
                            </div>

                            {/* Cashier details */}
                            <div className="flex gap-3">
                                <User className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Cashier / Staff</span>
                                    <span className="block text-slate-200 font-bold">{order.user ? order.user.name : 'System'}</span>
                                    <span className="block text-[10px] text-slate-500 font-mono font-medium">{order.user?.email}</span>
                                </div>
                            </div>

                            {/* Customer details */}
                            <div className="flex gap-3">
                                <Clock className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Customer Details</span>
                                    <span className="block text-slate-200 font-bold">
                                        {order.customer_id ? `Customer ID: ${order.customer_id}` : 'Walk-in Customer'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Status Manager */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-indigo-400" />
                            Payment Method & Status
                        </h4>

                        <div className="space-y-3.5 text-xs font-semibold">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Method</span>
                                <span className="text-slate-200 uppercase font-bold tracking-wide">
                                    {order.payment_method ? order.payment_method.replace('_', ' ') : 'N/A'}
                                </span>
                            </div>

                            <div className="flex flex-col gap-2 pt-1 border-t border-slate-850">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Update Payment Status</label>
                                <select
                                    value={order.payment_status || 'paid'}
                                    onChange={(e) => handlePaymentStatusChange(e.target.value)}
                                    disabled={isUpdatingPayment}
                                    className="w-full px-3 py-2 text-xs bg-slate-950/40 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer disabled:opacity-50"
                                >
                                    <option value="pending" className="bg-slate-900">Pending</option>
                                    <option value="paid" className="bg-slate-900">Paid</option>
                                    <option value="refunded" className="bg-slate-900">Refunded</option>
                                    <option value="failed" className="bg-slate-900">Failed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-3 mb-1">
                            Action Center
                        </h4>

                        <div className="flex flex-col gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={Eye}
                                onClick={handleOpenInvoicePreview}
                                className="w-full text-slate-205 border-slate-800 bg-slate-950/20 hover:bg-slate-900/60 h-9 font-bold"
                            >
                                Preview Invoice
                            </Button>

                            <Button
                                variant="secondary"
                                size="sm"
                                icon={Printer}
                                onClick={handlePrintReceipt}
                                isLoading={isPrinting}
                                disabled={isPrinting}
                                className="w-full text-slate-200 border-slate-800 bg-slate-950/20 hover:bg-slate-900/60 h-9 font-bold"
                            >
                                Print Receipt
                            </Button>

                            <Button
                                variant="secondary"
                                size="sm"
                                icon={Download}
                                onClick={handleDownloadInvoice}
                                isLoading={isDownloadingPdf}
                                disabled={isDownloadingPdf}
                                className="w-full text-slate-200 border-slate-800 bg-slate-950/20 hover:bg-slate-900/60 h-9 font-bold"
                            >
                                Download Invoice
                            </Button>

                            {order.status === 'completed' && (
                                <Button
                                    variant="danger"
                                    size="sm"
                                    icon={XCircle}
                                    onClick={() => setCancelConfirmOrder(true)}
                                    className="w-full h-9 font-bold border-red-950/30 bg-red-950/10 hover:bg-red-950/30 text-rose-450 hover:text-rose-350"
                                >
                                    Cancel Order
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* TRANSACTION CANCELLATION CONFIRMATION MODAL */}
            {cancelConfirmOrder && (
                <Modal
                    isOpen={cancelConfirmOrder}
                    onClose={() => setCancelConfirmOrder(false)}
                    title="Confirm Order Cancellation"
                    size="sm"
                >
                    <div className="space-y-4">
                        <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                            Are you sure you want to cancel transaction <strong className="text-slate-100">{order.order_number}</strong>?
                        </p>
                        <div className="p-3.5 bg-rose-500/10 border border-rose-500/10 rounded-xl text-[11px] text-rose-400 leading-relaxed font-bold flex gap-2">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                            <div>
                                This action will mark the transaction as Cancelled and automatically return all items to stock. This operation is permanent and cannot be undone.
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-850">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setCancelConfirmOrder(false)}
                                disabled={isCancelling}
                                className="border-slate-850 text-slate-455"
                            >
                                No, Keep Order
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleCancelOrder}
                                isLoading={isCancelling}
                                disabled={isCancelling}
                            >
                                Yes, Cancel Order
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* INVOICE PREVIEW MODAL */}
            {showInvoicePreview && (
                <Modal
                    isOpen={showInvoicePreview}
                    onClose={() => setShowInvoicePreview(false)}
                    title="Invoice Document Preview"
                    size="lg"
                >
                    {isLoadingInvoice ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs text-slate-400 font-semibold">Generating invoice preview...</p>
                        </div>
                    ) : invoiceData ? (
                        <div className="space-y-6">
                            {/* Paper Mockup */}
                            <div className="bg-white text-slate-900 p-8 rounded-xl shadow-inner border border-slate-100 font-sans leading-relaxed text-xs overflow-x-auto">
                                {/* Header */}
                                <div className="flex justify-between items-start gap-4 border-b border-slate-200 pb-5">
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                            {invoiceData.company?.name || 'Company'}
                                        </h2>
                                        <p className="text-slate-500 text-[10px] mt-1 font-semibold leading-normal">
                                            {invoiceData.company?.address}<br />
                                            {invoiceData.company?.email} {invoiceData.company?.phone}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <h1 className="text-xl font-extrabold text-slate-900 tracking-wider">INVOICE</h1>
                                        <p className="text-slate-700 font-bold mt-1 text-[11px]">
                                            {invoiceData.order_number}
                                        </p>
                                        <p className="text-slate-500 text-[10px] font-semibold mt-0.5">
                                            Date: {new Date(invoiceData.date).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Section details */}
                                <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-150">
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Branch Details</h4>
                                        <p className="text-slate-800 font-bold">{invoiceData.branch?.name}</p>
                                        <p className="text-slate-500 text-[10px] font-semibold leading-normal">
                                            {invoiceData.branch?.address}<br />
                                            Phone: {invoiceData.branch?.phone || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Registry Details</h4>
                                        <p className="text-slate-800 font-semibold">
                                            <span className="text-slate-400 font-bold">Cashier:</span> {invoiceData.cashier_name}
                                        </p>
                                        <p className="text-slate-800 font-semibold">
                                            <span className="text-slate-400 font-bold">Customer ID:</span> {invoiceData.customer?.customer_id || 'Walk-in'}
                                        </p>
                                        <p className="text-slate-800 font-semibold">
                                            <span className="text-slate-400 font-bold">Payment:</span> {invoiceData.payment_method?.toUpperCase().replace('_', ' ')} ({invoiceData.payment_status?.toUpperCase()})
                                        </p>
                                    </div>
                                </div>

                                {/* Table of items */}
                                <table className="w-full mt-5 border-collapse text-[11px] font-semibold">
                                    <thead>
                                        <tr className="border-b border-slate-250 text-slate-500 text-left">
                                            <th className="py-2 pr-4 font-bold">Item</th>
                                            <th className="py-2 px-2 text-right font-bold">Qty</th>
                                            <th className="py-2 px-2 text-right font-bold">Unit Price</th>
                                            <th className="py-2 px-2 text-right font-bold">Discount</th>
                                            <th className="py-2 pl-4 text-right font-bold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {invoiceData.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="py-2.5 pr-4 font-semibold text-slate-900">
                                                    {item.product_name}
                                                    {item.variation_name && (
                                                        <span className="block text-[9px] text-slate-500 font-medium">({item.variation_name})</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-2 text-right font-mono">{item.quantity}</td>
                                                <td className="py-2.5 px-2 text-right font-mono">${parseFloat(item.unit_price).toFixed(2)}</td>
                                                <td className="py-2.5 px-2 text-right font-mono text-rose-600">${parseFloat(item.discount_amount).toFixed(2)}</td>
                                                <td className="py-2.5 pl-4 text-right font-mono text-slate-900">${parseFloat(item.total_price).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Totals Table */}
                                <div className="flex justify-end mt-6">
                                    <table className="w-64 border-collapse text-[11px] font-semibold">
                                        <tbody className="text-slate-700">
                                            <tr>
                                                <td className="py-1 text-left text-slate-500 font-bold">Subtotal</td>
                                                <td className="py-1 text-right font-mono">${parseFloat(invoiceData.subtotal).toFixed(2)}</td>
                                            </tr>
                                            {parseFloat(invoiceData.discount_amount) > 0 && (
                                                <tr>
                                                    <td className="py-1 text-left text-rose-600 font-bold">Discount</td>
                                                    <td className="py-1 text-right font-mono text-rose-600">-${parseFloat(invoiceData.discount_amount).toFixed(2)}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td className="py-1 text-left text-slate-500 font-bold">Tax</td>
                                                <td className="py-1 text-right font-mono">${parseFloat(invoiceData.tax_amount).toFixed(2)}</td>
                                            </tr>
                                            <tr className="border-t border-slate-900 font-bold text-slate-900 text-xs">
                                                <td className="py-2 text-left">Grand Total</td>
                                                <td className="py-2 text-right font-mono text-indigo-750">${parseFloat(invoiceData.grand_total).toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Footer Controls */}
                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Download}
                                    onClick={handleDownloadInvoice}
                                    isLoading={isDownloadingPdf}
                                    disabled={isDownloadingPdf}
                                    className="border-slate-800 text-slate-300 hover:text-white"
                                >
                                    Download PDF
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowInvoicePreview(false)}
                                    className="border-slate-800"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-slate-400">Failed to render preview.</div>
                    )}
                </Modal>
            )}
        </PageWrapper>
    );
}
