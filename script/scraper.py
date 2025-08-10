import json
import re
import time
from pathlib import Path
from typing import Dict, List

import requests
from bs4 import BeautifulSoup


class KitchenCarScraper:
    def __init__(self, base_url: str = "https://www.mellow.jp/ss_web/markets/"):
        self.base_url = base_url
        self.session = requests.Session()
        self.soup = None

        # User-Agentを設定
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

    def fetch_page(self, market_id: str) -> str:
        """
        指定されたマーケットIDのページからHTMLを取得
        
        Args:
            market_id: マーケットID（例: "pAT5dN"）
            
        Returns:
            HTMLコンテンツ
        """
        url = f"{self.base_url}{market_id}"
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'  # エンコーディングを明示的に設定
            return response.text
        except requests.RequestException as e:
            raise Exception(f"ページの取得に失敗しました: {e}")

    def get_soup(self, html_content: str) -> BeautifulSoup:
        self.soup = BeautifulSoup(html_content, 'html.parser')
        return self.soup

    def parse_shop_info(self, html_content: str) -> List[Dict[str, str]]:
        """
        HTMLコンテンツからショップ情報を解析
        
        Args:
            html_content: 取得したHTMLコンテンツ
            
        Returns:
            ショップ情報のリスト
        """

        if html_content:
            self.soup = self.get_soup(html_content)

        # class="row g-4" がショップ全体のコンテナ
        shop_container = self.soup.find('div', {'class': 'row g-4'})

        if not shop_container:
            raise ValueError("ショップ情報が見つかりません。HTML構造が変更された可能性があります。")

        shops = []
        # class="col-lg-4" が各ショップのコンテナ
        for shop_div in shop_container.find_all('div', {'class': 'col-lg-4'}):
            shop_info = {}

            # 店名は class="card-title"の文字列
            title_element = shop_div.find('div', {'class': 'card-title'})
            if title_element:
                shop_info['name'] = title_element.get_text(strip=True)
            else:
                shop_info['name'] = "不明"

            # class="card-text"が3つあり、1つ目が代表メニュー名、2つ目が営業時間、3つ目が出店日
            card_texts = shop_div.find_all('div', {'class': 'card-text'})
            if len(card_texts) >= 3:
                shop_info['menu'] = card_texts[0].get_text(strip=True)
                shop_info['hours'] = card_texts[1].get_text(strip=True)
                shop_info['date'] = card_texts[2].get_text(strip=True)
            else:
                shop_info['menu'] = "不明"
                shop_info['hours'] = "不明"
                shop_info['date'] = "不明"
            # 日付を整形
            shop_info['date'] = self._format_shop_date(shop_info['date'])

            # aタグの class="text-body"がショップのURL
            url_element = shop_div.find('a', {'class': 'text-body'})
            if url_element and 'href' in url_element.attrs:
                shop_info['url'] = "/".join(self.base_url.split("/")[:3]) + url_element['href']
            else:
                shop_info['url'] = "不明"

            shops.append(shop_info)

        if not shops:
            raise ValueError("ショップ情報が見つかりません。HTML構造が変更された可能性があります。")

        return shops

    def _format_shop_date(self, date_str: str) -> str:
        """
        日付文字列を整形
        
        Args:
            date_str: 日付文字列
            
        Returns:
            整形された日付文字列
        """

        # 次回出店MM月DD日 -> YYYY-MM-DD形式に変換
        match = re.match(r'次回出店(\d{1,2})月(\d{1,2})日', date_str)
        if match:
            month = int(match.group(1))
            day = int(match.group(2))
            year = time.localtime().tm_year  # 現在の年を取得
            return f"{year:04d}-{month:02d}-{day:02d}"
        else:
            return date_str  # フォーマットが一致しない場合はそのまま返す

    def get_market_info(self, market_id: str):
        """
        指定されたマーケットIDの情報を取得
        """

        html_content = self.fetch_page(market_id)
        shop_info = self.parse_shop_info(html_content)

        # h3 class="fw-bold" はマーケット名
        market_name_element = self.soup.find('h3', {'class': 'fw-bold'})
        if market_name_element:
            market_name = market_name_element.get_text(strip=True)
            market_name = re.sub("キッチンカー出店情報：", "", market_name)
        else:
            market_name = "不明"
        
        return {
            "market_id": market_id,
            "market_name": market_name,
            "shop_info": shop_info,
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
        }

    def save_market_info(self, market_info: dict, file_path: str | Path):
        """
        マーケット情報をファイルに保存
        """
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(market_info, f, ensure_ascii=False, indent=2)
