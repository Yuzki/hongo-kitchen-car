import json
import time

from scraper import KitchenCarScraper

# Generate fresh JSON under the source data directory; GH Pages copy happens later.
DATA_DIR = "data/"

def load_markets(file_path: str = f"{DATA_DIR}markets.json") -> list:
    """
    markets.jsonからマーケット情報を読み込む
    
    Args:
        file_path: markets.jsonファイルのパス
        
    Returns:
        マーケット情報のリスト
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"{file_path} が見つかりません")
    except json.JSONDecodeError:
        raise ValueError(f"{file_path} の形式が正しくありません")


def get_data():
    """
    data/markets.jsonのIDを使用して各マーケットの情報を取得し、保存する
    """
    # markets.jsonを読み込み
    try:
        markets = load_markets()
        print(f"{len(markets)}個のマーケットが見つかりました")
    except Exception as e:
        print(f"マーケット情報の読み込みに失敗しました: {e}")
        return

    # スクレイパーを初期化
    scraper = KitchenCarScraper()
    
    # 各マーケットの情報を取得
    for market in markets:
        market_id = market.get("id")
        market_name = market.get("name")
        
        if not market_id:
            print(f"マーケット '{market_name}' のIDが見つかりません。スキップします。")
            continue
            
        print(f"\nマーケット '{market_name}' (ID: {market_id}) の情報を取得中...")
        
        try:
            # マーケット情報を取得
            market_info = scraper.get_market_info(market_id)
            
            # ファイルに保存
            output_path = f"{DATA_DIR}market_info_{market_id}.json"
            scraper.save_market_info(market_info, output_path)
            
            print(f"マーケット情報を {output_path} に保存しました")
            print(f"ショップ数: {len(market_info.get('shop_info', []))}")
            
            # リクエスト間の間隔を空ける（サーバーへの負荷軽減）
            time.sleep(1)
            
        except Exception as e:
            print(f"マーケット '{market_name}' の情報取得に失敗しました: {e}")
            continue

    print("\n全てのマーケット情報の取得が完了しました")


if __name__ == "__main__":
    get_data()
