import os
import json
import time
import hashlib
from typing import Dict, Any, Optional, List
import logging

# Configure logging
logger = logging.getLogger(__name__)

class EmbeddingCache:
    """Simple file-based cache for storing embeddings to reduce API calls"""
    
    def __init__(self, cache_dir: str = "./embedding_cache", ttl_days: int = 30):
        """
        Initialize the embedding cache
        
        Args:
            cache_dir: Directory to store cache files
            ttl_days: Time-to-live in days for cache entries
        """
        self.cache_dir = cache_dir
        self.ttl_seconds = ttl_days * 24 * 60 * 60
        self.cache_file = os.path.join(cache_dir, "embedding_cache.json")
        self.cache = {}
        self.stats = {
            "hits": 0,
            "misses": 0,
            "size": 0
        }
        
        # Create cache directory if it doesn't exist
        os.makedirs(cache_dir, exist_ok=True)
        
        # Load cache from file if it exists
        self._load_cache()
        
    def _generate_key(self, text: str) -> str:
        """Generate a cache key from text using MD5 hash"""
        # Use MD5 for fast key generation (not for security)
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def _load_cache(self) -> None:
        """Load cache from file"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r') as f:
                    data = json.load(f)
                    self.cache = data.get("cache", {})
                    self.stats = data.get("stats", {"hits": 0, "misses": 0, "size": len(self.cache)})
                    
                # Update cache size stat
                self.stats["size"] = len(self.cache)
                logger.info(f"Loaded embedding cache with {self.stats['size']} entries")
            except Exception as e:
                logger.error(f"Error loading embedding cache: {e}")
                self.cache = {}
                self.stats = {"hits": 0, "misses": 0, "size": 0}
    
    def _save_cache(self) -> None:
        """Save cache to file"""
        try:
            # Combine cache and stats
            data = {
                "cache": self.cache,
                "stats": self.stats,
                "last_saved": time.time()
            }
            
            with open(self.cache_file, 'w') as f:
                json.dump(data, f)
            
            logger.info(f"Saved embedding cache with {self.stats['size']} entries")
        except Exception as e:
            logger.error(f"Error saving embedding cache: {e}")
    
    def get(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Get embedding from cache
        
        Args:
            text: Text to get embedding for
            
        Returns:
            Cached embedding data or None if not found/expired
        """
        key = self._generate_key(text)
        logger.debug(f"Looking up cache with key: {key} for text: {text[:50]}")
        
        if key in self.cache:
            cache_entry = self.cache[key]
            timestamp = cache_entry.get("timestamp", 0)
            
            # Check if entry is still valid
            if time.time() - timestamp <= self.ttl_seconds:
                self.stats["hits"] += 1
                logger.debug(f"Cache hit for: {text[:50]}")
                return cache_entry.get("data")
            else:
                logger.debug(f"Cache entry expired for: {text[:50]}")
        
        self.stats["misses"] += 1
        logger.debug(f"Cache miss for: {text[:50]}")
        return None
    
    def set(self, text: str, embedding_data: Dict[str, Any]) -> None:
        """
        Store embedding in cache
        
        Args:
            text: Text associated with embedding
            embedding_data: Embedding data to cache
        """
        key = self._generate_key(text)
        logger.debug(f"Storing in cache with key: {key} for text: {text[:50]}")
        
        # Store data with timestamp
        self.cache[key] = {
            "timestamp": time.time(),
            "data": embedding_data,
            "text": text[:100]  # Store truncated text for debugging
        }
        
        # Update cache size
        self.stats["size"] = len(self.cache)
        logger.debug(f"Cache size now: {self.stats['size']}")
        
        # Save to file every 10 new entries to minimize I/O
        if self.stats["size"] % 10 == 0 or self.stats["size"] == 1:
            logger.info(f"Auto-saving cache with {self.stats['size']} entries")
            self._save_cache()
    
    def clear_expired(self) -> int:
        """
        Clear expired entries from cache
        
        Returns:
            Number of entries cleared
        """
        now = time.time()
        expired_keys = [
            key for key, entry in self.cache.items()
            if now - entry.get("timestamp", 0) > self.ttl_seconds
        ]
        
        # Remove expired entries
        for key in expired_keys:
            del self.cache[key]
        
        # Update size stat
        self.stats["size"] = len(self.cache)
        
        # Save updated cache
        if expired_keys:
            self._save_cache()
            
        return len(expired_keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "size": self.stats["size"],
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_ratio": self.stats["hits"] / (self.stats["hits"] + self.stats["misses"]) * 100 if (self.stats["hits"] + self.stats["misses"]) > 0 else 0
        }
    
    def save(self) -> None:
        """Explicitly save cache to file"""
        self._save_cache()

    def batch_get(self, texts: List[str]) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Get multiple embeddings from cache in batch
        
        Args:
            texts: List of texts to get embeddings for
            
        Returns:
            Dictionary mapping each text to its cached embedding or None
        """
        results = {}
        for text in texts:
            results[text] = self.get(text)
        return results

    def batch_set(self, text_embeddings: Dict[str, Dict[str, Any]]) -> None:
        """
        Store multiple embeddings in cache
        
        Args:
            text_embeddings: Dictionary mapping texts to their embedding data
        """
        for text, embedding_data in text_embeddings.items():
            self.set(text, embedding_data)
        
        # Save after batch operation
        self._save_cache()