'use strict';

/**
 * Example: API v1 - to'lov yaratish, holatini tekshirish, balans/statistika
 */

const { CheckoutClientV1, ApiError } = require('../src');

const client = new CheckoutClientV1('YOUR_API_KEY');

async function main() {
  // --- To'lov yaratish ---
  let payment;
  try {
    payment = await client.createPayment(50000, "Buyurtma #12345");

    console.log("To'lov yaratildi:");
    console.log('  ID     :', payment.id);
    console.log('  UUID   :', payment.uuid);
    console.log('  URL    :', payment.url);
    console.log('  Summa  :', payment.amount, 'UZS');
    console.log('  Status :', payment.status);

    // Foydalanuvchini to'lov sahifasiga yo'naltirish:
    // res.redirect(payment.url);
  } catch (err) {
    if (err instanceof ApiError) {
      console.error('Xato:', err.message);
      process.exit(1);
    }
    throw err;
  }

  // --- To'lov holatini tekshirish ---
  try {
    const status = await client.getStatusById(payment.id);

    console.log("\nTo'lov holati:");
    console.log('  Status     :', status.status);
    console.log('  Yaratilgan :', status.createdAt);

    if (status.isPaid()) {
      console.log('  To\'langan  :', status.paidAt);
      console.log('  >>> Buyurtma tasdiqlandi!');
    } else {
      console.log("  >>> Hali to'lanmagan.");
    }
  } catch (err) {
    console.error('Xato:', err.message);
  }

  // --- Balans va statistika ---
  try {
    const balance = await client.getBalance();
    console.log('\nBalans:');
    console.log('  UZS :', balance.getUzs());

    const stats = await client.getStats();
    console.log('\nStatistika:');
    console.log('  Jami buyurtmalar :', stats.totalOrders);
    console.log('  Jami summa       :', stats.totalAmount, 'UZS');
  } catch (err) {
    console.error('Xato:', err.message);
  }
}

main();
