import os
import json
import time
import hashlib
import logging
from typing import Dict, Any, Optional, List, Union

# Configure logging
logger = logging.getLogger(__name__)

class BaseEmbeddingCache:
    """Base class for embedding cache implementations"""
    
    def __init__(self, ttl_days: int = 30):
        """
        Initialize the embedding cache
        
        Args:
            ttl_days: Time-to-live in days for cache entries
        """
        self.ttl_seconds = ttl_days * 24 * 60 * 60
        self.stats = {
            "hits": 0,
            "misses": 0,
            "size": 0
        }
    
    def _generate_key(self, text: str) -> str:
        """Generate a cache key from text using MD5 hash"""
        # Use MD5 for fast key generation (not for security)
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def get(self, text: str) -> Optional[Dict[str, Any]]:
        """Get embedding from cache - to be implemented by subclasses"""
        raise NotImplementedError
    
    def set(self, text: str, embedding_data: Dict[str, Any]) -> None:
        """Store embedding in cache - to be implemented by subclasses"""
        raise NotImplementedError
    
    def clear_expired(self) -> int:
        """Clear expired entries from cache - to be implemented by subclasses"""
        raise NotImplementedError
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "size": self.stats["size"],
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_ratio": self.stats["hits"] / (self.stats["hits"] + self.stats["misses"]) * 100 if (self.stats["hits"] + self.stats["misses"]) > 0 else 0
        }
    
    def save(self) -> None:
        """Explicitly save cache to file - to be implemented by subclasses"""
        pass

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
        self.save()


class FileEmbeddingCache(BaseEmbeddingCache):
    """File-based implementation of embedding cache"""
    
    def __init__(self, cache_dir: str = "./embedding_cache", ttl_days: int = 30):
        """
        Initialize the file-based embedding cache
        
        Args:
            cache_dir: Directory to store cache files
            ttl_days: Time-to-live in days for cache entries
        """
        super().__init__(ttl_days)
        self.cache_dir = cache_dir
        self.cache_file = os.path.join(cache_dir, "embedding_cache.json")
        self.cache = {}
        
        # Create cache directory if it doesn't exist
        os.makedirs(cache_dir, exist_ok=True)
        
        # Load cache from file if it exists
        self._load_cache()
    
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
                logger.info(f"Loaded file-based embedding cache with {self.stats['size']} entries")
            except Exception as e:
                logger.error(f"Error loading embedding cache from file: {e}")
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
            
            logger.info(f"Saved file-based embedding cache with {self.stats['size']} entries")
        except Exception as e:
            logger.error(f"Error saving embedding cache to file: {e}")
    
    def get(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Get embedding from cache
        
        Args:
            text: Text to get embedding for
            
        Returns:
            Cached embedding data or None if not found/expired
        """
        key = self._generate_key(text)
        logger.debug(f"Looking up file cache with key: {key} for text: {text[:50]}")
        
        if key in self.cache:
            cache_entry = self.cache[key]
            timestamp = cache_entry.get("timestamp", 0)
            
            # Check if entry is still valid
            if time.time() - timestamp <= self.ttl_seconds:
                self.stats["hits"] += 1
                logger.debug(f"File cache hit for: {text[:50]}")
                return cache_entry.get("data")
            else:
                logger.debug(f"File cache entry expired for: {text[:50]}")
        
        self.stats["misses"] += 1
        logger.debug(f"File cache miss for: {text[:50]}")
        return None
    
    def set(self, text: str, embedding_data: Dict[str, Any]) -> None:
        """
        Store embedding in cache
        
        Args:
            text: Text associated with embedding
            embedding_data: Embedding data to cache
        """
        key = self._generate_key(text)
        logger.debug(f"Storing in file cache with key: {key} for text: {text[:50]}")
        
        # Store data with timestamp
        self.cache[key] = {
            "timestamp": time.time(),
            "data": embedding_data,
            "text": text[:100]  # Store truncated text for debugging
        }
        
        # Update cache size
        self.stats["size"] = len(self.cache)
        logger.debug(f"File cache size now: {self.stats['size']}")
        
        # Save to file every 10 new entries to minimize I/O
        if self.stats["size"] % 10 == 0 or self.stats["size"] == 1:
            logger.info(f"Auto-saving file cache with {self.stats['size']} entries")
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
    
    def save(self) -> None:
        """Explicitly save cache to file"""
        self._save_cache()


class RedisEmbeddingCache(BaseEmbeddingCache):
    """Redis-based implementation of embedding cache"""
    
    def __init__(self, redis_client=None, prefix: str = "embedding_cache:", ttl_days: int = 30):
        """
        Initialize the Redis-based embedding cache
        
        Args:
            redis_client: Initialized Redis client
            prefix: Prefix for Redis keys to avoid collisions
            ttl_days: Time-to-live in days for cache entries
        """
        super().__init__(ttl_days)
        self.redis = redis_client
        self.prefix = prefix
        self.stats_key = f"{prefix}stats"
        
        # Load stats from Redis if they exist
        self._load_stats()
        
        logger.info(f"Initialized Redis-based embedding cache with prefix '{prefix}'")
    
    def _load_stats(self) -> None:
        """Load stats from Redis"""
        if self.redis:
            try:
                stats_json = self.redis.get(self.stats_key)
                if stats_json:
                    self.stats = json.loads(stats_json)
                    logger.info(f"Loaded Redis cache stats: {self.stats}")
                else:
                    # Initialize stats in Redis
                    self._save_stats()
            except Exception as e:
                logger.error(f"Error loading stats from Redis: {e}")
    
    def _save_stats(self) -> None:
        """Save stats to Redis"""
        if self.redis:
            try:
                self.redis.set(self.stats_key, json.dumps(self.stats))
            except Exception as e:
                logger.error(f"Error saving stats to Redis: {e}")
    
    def _get_full_key(self, key: str) -> str:
        """Get the full Redis key with prefix"""
        return f"{self.prefix}{key}"
    
    def get(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Get embedding from Redis cache
        
        Args:
            text: Text to get embedding for
            
        Returns:
            Cached embedding data or None if not found/expired
        """
        if not self.redis:
            self.stats["misses"] += 1
            return None
            
        key = self._generate_key(text)
        full_key = self._get_full_key(key)
        logger.debug(f"Looking up Redis cache with key: {full_key}")
        
        try:
            # Redis automatically handles expiration
            cached_json = self.redis.get(full_key)
            if cached_json:
                self.stats["hits"] += 1
                self._save_stats()
                logger.debug(f"Redis cache hit for: {text[:50]}")
                return json.loads(cached_json)
            else:
                self.stats["misses"] += 1
                self._save_stats()
                logger.debug(f"Redis cache miss for: {text[:50]}")
                return None
        except Exception as e:
            logger.error(f"Error accessing Redis cache: {e}")
            self.stats["misses"] += 1
            self._save_stats()
            return None
    
    def set(self, text: str, embedding_data: Dict[str, Any]) -> None:
        """
        Store embedding in Redis cache
        
        Args:
            text: Text associated with embedding
            embedding_data: Embedding data to cache
        """
        if not self.redis:
            return
            
        key = self._generate_key(text)
        full_key = self._get_full_key(key)
        logger.debug(f"Storing in Redis cache with key: {full_key}")
        
        try:
            # Store data as JSON
            self.redis.set(
                full_key,
                json.dumps(embedding_data),
                ex=self.ttl_seconds  # Set expiration time
            )
            
            # Update size count in Redis
            self.stats["size"] = self.redis.dbsize()  # This is an approximation
            self._save_stats()
            logger.debug(f"Redis cache size approximation: {self.stats['size']}")
        except Exception as e:
            logger.error(f"Error storing in Redis cache: {e}")
    
    def clear_expired(self) -> int:
        """
        Clear expired entries from cache - Redis automatically handles expiration
        but we can update our stats
        
        Returns:
            0 (Redis handles expiration automatically)
        """
        if not self.redis:
            return 0
            
        try:
            # Redis handles expiration automatically
            # We can use DBSIZE to get an updated key count
            self.stats["size"] = self.redis.dbsize()
            self._save_stats()
            logger.info(f"Updated Redis cache size: {self.stats['size']}")
        except Exception as e:
            logger.error(f"Error updating Redis cache stats: {e}")
        
        return 0  # Redis handles expiration automatically
    
    def save(self) -> None:
        """Explicitly save stats to Redis"""
        self._save_stats()


def create_embedding_cache(cache_type: str = "file", **kwargs) -> BaseEmbeddingCache:
    """
    Factory function to create the appropriate embedding cache
    
    Args:
        cache_type: Type of cache to create ("file" or "redis")
        **kwargs: Additional arguments to pass to the cache constructor
        
    Returns:
        An instance of BaseEmbeddingCache
    """
    # Common parameters
    ttl_days = kwargs.get("ttl_days", 30)
    
    if cache_type.lower() == "redis":
        # Check if redis-py is installed
        try:
            import redis
            
            # Get Redis connection parameters from kwargs or use defaults
            redis_host = kwargs.get("redis_host", "localhost")
            redis_port = kwargs.get("redis_port", 6379)
            redis_db = kwargs.get("redis_db", 0)
            redis_password = kwargs.get("redis_password", None)
            prefix = kwargs.get("prefix", "embedding_cache:")
            
            # Create Redis client
            redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                password=redis_password,
                decode_responses=True
            )
            
            # Test connection
            try:
                redis_client.ping()
                logger.info(f"Connected to Redis at {redis_host}:{redis_port}")
                
                # Create Redis-based cache
                return RedisEmbeddingCache(redis_client, prefix, ttl_days)
                
            except redis.ConnectionError:
                logger.error(f"Failed to connect to Redis at {redis_host}:{redis_port}")
                logger.info("Falling back to file-based cache")
                
                # Extract only the file-relevant parameters
                file_kwargs = {
                    "ttl_days": ttl_days,
                    "cache_dir": kwargs.get("cache_dir", "./embedding_cache")
                }
                
                return FileEmbeddingCache(**file_kwargs)
                
        except ImportError:
            logger.error("Redis package not installed. Falling back to file-based cache.")
            
            # Extract only the file-relevant parameters
            file_kwargs = {
                "ttl_days": ttl_days,
                "cache_dir": kwargs.get("cache_dir", "./embedding_cache")
            }
            
            return FileEmbeddingCache(**file_kwargs)
    
    # Default to file-based cache with only the relevant params
    file_kwargs = {
        "ttl_days": ttl_days,
        "cache_dir": kwargs.get("cache_dir", "./embedding_cache")
    }
    
    return FileEmbeddingCache(**file_kwargs)