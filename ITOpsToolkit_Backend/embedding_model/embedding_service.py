"""
embedder.py

A generic HuggingFace embedding class.
Default model is Google's Gemma embedding model, but any HuggingFace
text embedding model can be passed in via the constructor.

Requires: pip install torch transformers
"""
import os
import logging
import numpy as np

from transformers import AutoTokenizer
from sentence_transformers import SentenceTransformer
from langchain_huggingface import HuggingFaceEmbeddings

from pro_logger import log_event, application_logger


class Embedder:
    # Default model — can be overridden via constructorem
    DEFAULT_MODEL = "sentence-transformers/all-mpnet-base-v2"

    def __init__(self, model_dir: str, model_name: str = None):
        self.model_name = model_name or self.DEFAULT_MODEL
        self.model_dir = model_dir
        self.model = None 

    def download_if_not_present(self) -> None:
        marker_file = os.path.join(self.model_dir, "modules.json")  # SentenceTransformer marker

        if os.path.exists(marker_file):
            print(f"[Embedder] Loading model from '{self.model_dir}'")
          
        else:
            print(f"[Embedder] Downloading '{self.model_name}' …")
            tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            tokenizer.save_pretrained(self.model_dir)

            model = SentenceTransformer(self.model_name)
            model.save(self.model_dir)
            print("[Embedder] Download complete.")

    def embed(self, query: str) -> np.ndarray:
        encode_kwargs = {'normalize_embeddings': False}
        model_kwargs = {'device': 'cpu'}

        try:
            self.model = HuggingFaceEmbeddings(model_name = self.model_dir,
                                            model_kwargs = model_kwargs,
                                            encode_kwargs = encode_kwargs)
            if self.model is None:
                raise RuntimeError(
                    "Model is not loaded. Call `download_if_not_present()` before embedding."
                )
            
            
            return (True, self.model.embed_query(query))
        except Exception as e:   
    
            log_event(application_logger,
                      logging.ERROR,
                      str(e),
                      module_name = "utility",
                      component_type = "Embedder",
                      component_name = "embedding_service - embed")
            return (False, f"Text embedding failed - {str(e)}")
