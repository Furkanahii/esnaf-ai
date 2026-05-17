import json
import os
import random
from datetime import datetime

def generate_mock_trends():
    locations = ["Kadıköy", "Moda", "Üsküdar", "Ataşehir", "Beşiktaş"]
    
    # Kurgusal pazar verileri için havuz
    products_pool = {
        "gıda": [
            {"name": "Enerji İçeceği 250ml", "base_price": 40},
            {"name": "Filtre Kahve 250g", "base_price": 250},
            {"name": "Soğuk Çay 330ml", "base_price": 35},
            {"name": "Yumurta (30'lu)", "base_price": 115},
            {"name": "Zeytinyağı 1L", "base_price": 320}
        ],
        "kozmetik": [
            {"name": "Güneş Kremi 50 SPF", "base_price": 350},
            {"name": "Nemlendirici Krem 50ml", "base_price": 280},
            {"name": "Şampuan 400ml", "base_price": 140}
        ],
        "elektronik": [
            {"name": "Type-C Şarj Kablosu", "base_price": 120},
            {"name": "AA Pil (4'lü)", "base_price": 85}
        ]
    }
    
    selected_location = random.choice(locations)
    trends = []
    
    # Rastgele 3-4 farklı trend üret
    categories = list(products_pool.keys())
    random.shuffle(categories)
    
    for cat in categories[:random.randint(2, 3)]:
        product = random.choice(products_pool[cat])
        
        # Trend mantığı: Fiyat dalgalanması ve Talep artışı
        demand_increase = random.randint(15, 85)
        price_fluctuation = random.uniform(1.05, 1.25) # %5 ile %25 arası zam
        competitor_price = int(product["base_price"] * price_fluctuation)
        
        # Dinamik insight metni üretimi
        if demand_increase > 50:
            insight = f"Getir ve Trendyol simülasyon verilerine göre {selected_location} bölgesinde '{product['name']}' talebi %{demand_increase} patladı! Rakipler stok eritiyor."
        else:
            insight = f"Bölgendeki rakip esnafların çoğu '{product['name']}' fiyatını güncelledi. Yeni ortalama fiyat {competitor_price} TL seviyesinde."
            
        trends.append({
            "category": cat,
            "product_name": product["name"],
            "demand_increase_percent": demand_increase,
            "competitor_avg_price": competitor_price,
            "insight": insight
        })
        
    data = {
        "location": selected_location,
        "generated_at": datetime.now().isoformat(),
        "trends": trends
    }
    
    file_path = os.path.join(os.path.dirname(__file__), "data", "neighborhood_trends.json")
    
    # Dizinin var olduğundan emin ol
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Mock pazar verileri ({selected_location} için) başarıyla üretildi: {file_path}")

if __name__ == "__main__":
    generate_mock_trends()
