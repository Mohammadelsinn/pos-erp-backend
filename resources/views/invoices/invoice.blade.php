<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice['order_number'] }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #222; }
        h1 { font-size: 20px; margin-bottom: 0; }
        .muted { color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border-bottom: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; }
        .text-right { text-align: right; }
        .totals { width: 260px; margin-left: auto; margin-top: 12px; }
        .totals td { border: none; padding: 3px 8px; }
        .totals .grand { font-weight: bold; font-size: 14px; border-top: 1px solid #333; }
        .header { display: flex; justify-content: space-between; }
        .section { margin-top: 16px; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>{{ $invoice['company']['name'] ?? 'Company' }}</h1>
            <div class="muted">{{ $invoice['company']['address'] ?? '' }}</div>
            <div class="muted">{{ $invoice['company']['email'] ?? '' }} {{ $invoice['company']['phone'] ?? '' }}</div>
        </div>
        <div class="text-right">
            <h1>INVOICE</h1>
            <div>{{ $invoice['order_number'] }}</div>
            <div class="muted">{{ \Illuminate\Support\Carbon::parse($invoice['date'])->format('Y-m-d H:i') }}</div>
        </div>
    </div>

    <div class="section">
        <strong>Branch:</strong> {{ $invoice['branch']['name'] ?? '' }}, {{ $invoice['branch']['address'] ?? '' }}<br>
        <strong>Cashier:</strong> {{ $invoice['cashier_name'] }}<br>
        <strong>Customer ID:</strong> {{ $invoice['customer']['customer_id'] ?? 'Walk-in' }}<br>
        <strong>Payment:</strong> {{ ucfirst($invoice['payment_method'] ?? '-') }} ({{ ucfirst($invoice['payment_status'] ?? '-') }})
    </div>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Tax</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice['items'] as $item)
                <tr>
                    <td>{{ $item['product_name'] }}{{ $item['variation_name'] ? ' - ' . $item['variation_name'] : '' }}</td>
                    <td class="text-right">{{ $item['quantity'] }}</td>
                    <td class="text-right">{{ number_format($item['unit_price'], 2) }}</td>
                    <td class="text-right">{{ number_format($item['discount_amount'], 2) }}</td>
                    <td class="text-right">{{ number_format($item['tax_amount'], 2) }}</td>
                    <td class="text-right">{{ number_format($item['total_price'], 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td>Subtotal</td><td class="text-right">{{ number_format($invoice['subtotal'], 2) }}</td></tr>
        <tr><td>Discount</td><td class="text-right">-{{ number_format($invoice['discount_amount'], 2) }}</td></tr>
        <tr><td>Tax</td><td class="text-right">{{ number_format($invoice['tax_amount'], 2) }}</td></tr>
        <tr class="grand"><td>Grand Total</td><td class="text-right">{{ number_format($invoice['grand_total'], 2) }}</td></tr>
    </table>
</body>
</html>
