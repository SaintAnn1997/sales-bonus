/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // purchase — это одна из записей в поле items из чека в data.purchase_records
    // _product — это продукт из коллекции data.products
    let { discount, sale_price, quantity } = purchase;

    discount = 1 - (purchase.discount / 100);
    return sale_price * quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else { // Для всех остальных
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Здесь посчитаем промежуточные данные и отсортируем продавцов
    // Вызовем функцию расчёта бонуса для каждого продавца в отсортированном массиве
    // Сформируем и вернём отчёт

    // @TODO: Проверка входных данных
    const condition1 = !Array.isArray(data.sellers);
    const condition2 = data.sellers.length === 0;
    const condition3 = !Array.isArray(data.products);
    const condition4 = data.products.length === 0;
    const condition5 = !Array.isArray(data.purchase_records);
    const condition6 = data.purchase_records.length === 0;

    if (!data
        || condition1
        || condition2
        || condition3
        || condition4
        || condition5
        || condition6
    ) {
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций
    // Здесь проверим входящие данные
    const { calculateRevenue, calculateBonus } = options; // Сюда передадим функции для расчётов

    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Переменный не опредлены');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => (
        {
            id: seller.id,
            name: `${seller.first_name} ${seller.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        }
    ));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = sellerStats.reduce((result, item) => ({
        ...result,
        [item.id]: item,
    }), {});

    const productIndex = data.products.reduce((result, item) => ({
        ...result,
        [item.sku]: item,
    }), {})

    // @TODO: Расчёт выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => { // Чек 
        const seller = sellerIndex[record.seller_id]; // Продавец

        seller.sales_count += 1;

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар

            // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            const cost = product.purchase_price * item.quantity;

            // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            if (typeof calculateRevenue === "function") {
                const itemRevenue = calculateRevenue(item, product);
                seller.revenue += Number(itemRevenue.toFixed(2));
                seller.profit += itemRevenue - cost;
            } else {
                throw new Error('Переменная не является функцией');
            }

            // Учёт количества проданных товаров
            // По артикулу товара увеличить его проданное количество у продавца
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });

    });

    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller)
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10) // Формируем топ-10 товаров
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: Number(seller.revenue.toFixed(2)),
        profit: Number(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: Number(seller.bonus.toFixed(2)),
    }));
} 
