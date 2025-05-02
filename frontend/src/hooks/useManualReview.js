import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../utils/zustandStore';
import { getCommentById, updateCommentCategory, getProcessedComments } from './apiService';
import { mockComments } from '../utils/categoryUtils';
import { APP_STATES } from '../utils/stateManager';

export const useManualReview = () => {
  // Use Zustand store for state management
  const appState = useAppStore(state => state.appState);
  const importComplete = useAppStore(state => state.importComplete);
  const currentProjectId = useAppStore(state => state.projectId);
  const reviewState = useAppStore(state => state.reviewState);
  const checkProcessingStatus = useAppStore(state => state.checkProcessingStatus);
  const setReviewState = useAppStore(state => state.setReviewState);
  const clearReviewState = useAppStore(state => state.clearReviewState);
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const commentId = parseInt(searchParams.get('id'), 10);
  
  // Reference to track the last processed comment ID to prevent loops
  const lastProcessedIdRef = useRef(null);
  // Reference to track component mount state
  const isMounted = useRef(true);
  
  // Track if this is a single comment view or list navigation
  const [isSingleCommentMode, setIsSingleCommentMode] = useState(true);
  
  const [comment, setComment] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [similarComments, setSimilarComments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // List mode states - get initial values from Zustand store
  const [commentsList, setCommentsList] = useState(() => {
    return reviewState.commentsList || [];
  });
  
  const [currentIndex, setCurrentIndex] = useState(() => {
    return reviewState.index || 0;
  });
  
  const [totalCount, setTotalCount] = useState(() => {
    return reviewState.totalCount || 0;
  });
  
  const [listCategory, setListCategory] = useState(() => {
    return reviewState.category || '';
  });
  
  const [completedItems, setCompletedItems] = useState({});

  // Set mounted state and clear up on unmount
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Check URL params to determine if this is a direct navigation with a category
  useEffect(() => {
    // Get the category parameter from URL
    const categoryParam = searchParams.get('category');
    
    // If we have a category parameter, this is a list navigation view
    if (categoryParam) {
      setIsSingleCommentMode(false);
      
      // If the category parameter doesn't match the current list category, load the new category
      if (categoryParam !== listCategory && commentId) {
        // This is coming from AutoReview with a specific category
        loadCommentsWithCategory(commentId, categoryParam);
      }
    } else {
      // No category parameter means this is a single comment view
      setIsSingleCommentMode(true);
    }
  }, [location.search]);

  // Add this new function to load comments with a specific category
  const loadCommentsWithCategory = async (id, category) => {
    if (!currentProjectId || !id || !category) return;
    
    try {
      setIsLoading(true);
      
      // Get comments for the specific category
      const commentsResponse = await getProcessedComments(
        1,
        100,
        category,
        currentProjectId
      );
      
      if (commentsResponse.success && commentsResponse.data && 
          commentsResponse.data.comments && commentsResponse.data.comments.length > 0) {
        
        // Find the comment index in the filtered list
        const commentIndex = commentsResponse.data.comments.findIndex(c => c.id === id);
        const validIndex = commentIndex >= 0 ? commentIndex : 0;
        
        // Update Zustand state
        setReviewState({
          commentsList: commentsResponse.data.comments,
          category: category,
          index: validIndex,
          totalCount: commentsResponse.data.pagination.total || commentsResponse.data.comments.length
        });
        
        // Update local state if component is still mounted
        if (isMounted.current) {
          setCommentsList(commentsResponse.data.comments);
          setListCategory(category);
          setCurrentIndex(validIndex);
          setTotalCount(commentsResponse.data.pagination.total || commentsResponse.data.comments.length);
          setIsSingleCommentMode(false);
        }
      }
    } catch (error) {
      console.error("Error loading category-specific comments:", error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Check if comment ID exists but comments list is empty
  useEffect(() => {
    // If comment ID exists but comments list is empty, this might be direct navigation or refresh
    if (commentId && (!commentsList || commentsList.length === 0)) {
      loadCommentsForDirectNavigation(commentId);
    }
  }, [commentId]);

  // For direct navigation or refresh
  const loadCommentsForDirectNavigation = async (id) => {
    if (!currentProjectId || !id) return;
    
    try {
      setIsLoading(true);
      
      // Check if we have a category parameter in the URL
      const urlParams = new URLSearchParams(location.search);
      const categoryParam = urlParams.get('category');
      
      // If we have a category parameter, use it to load a list
      if (categoryParam) {
        await loadCommentsWithCategory(id, categoryParam);
        return;
      }
      
      // Otherwise, just load the single comment without a list
      const commentResponse = await getCommentById(id, currentProjectId);
      
      if (commentResponse.success && commentResponse.data) {
        // Just set the single comment without a list
        setComment(commentResponse.data);
        setKeywords(commentResponse.data.keywords || []);
        setSimilarComments(commentResponse.data.similar_comments || []);
        setSelectedCategory(commentResponse.data.category || "");
        
        // Clear the comments list to disable list navigation
        setCommentsList([]);
        setListCategory('');
        setCurrentIndex(0);
        setTotalCount(0);
        setIsSingleCommentMode(true);
        
        // Update Zustand store as well
        setReviewState({
          commentsList: [],
          category: '',
          index: 0,
          totalCount: 0
        });
      }
    } catch (error) {
      console.error("Error loading comment for direct navigation:", error);
      setError("Failed to load comment details");
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Check processing status on component mount
  useEffect(() => {
    const checkStatus = async () => {
      if (currentProjectId) {
        setIsRefreshing(true);
        try {
          const response = await checkProcessingStatus();
          
          if (response && response.success && response.status === 'completed') {
            // If processing just completed, refresh comments list
            await refreshCommentsList();
          }
        } catch (error) {
          console.error("Error checking processing status:", error);
        } finally {
          if (isMounted.current) {
            setIsRefreshing(false);
          }
        }
      }
    };
    
    checkStatus();
  }, [currentProjectId, checkProcessingStatus]);

  // Function to refresh comments list
  const refreshCommentsList = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const category = reviewState.category || "All Tags";
      
      if (currentProjectId) {
        const commentsResponse = await getProcessedComments(
          1,
          100,
          category,
          currentProjectId
        );
        
        if (commentsResponse.success && commentsResponse.data && 
            commentsResponse.data.comments && commentsResponse.data.comments.length > 0) {
          
          // Find the index of the current comment, if any
          let currentIdx = 0;
          if (commentId) {
            const foundIndex = commentsResponse.data.comments.findIndex(c => c.id === commentId);
            if (foundIndex >= 0) {
              currentIdx = foundIndex;
            }
          }
          
          // Update review state in Zustand store
          setReviewState({
            commentsList: commentsResponse.data.comments,
            category,
            index: currentIdx,
            totalCount: commentsResponse.data.pagination.total || commentsResponse.data.comments.length
          });
          
          // Update local state if component is still mounted
          if (isMounted.current) {
            setCommentsList(commentsResponse.data.comments);
            setListCategory(category);
            setCurrentIndex(currentIdx);
            setTotalCount(commentsResponse.data.pagination.total || commentsResponse.data.comments.length);
            
            // If we have a category from the URL, this is a list navigation view
            const categoryParam = searchParams.get('category');
            setIsSingleCommentMode(!categoryParam);
          }
          
          // If current comment is not in list, navigate to first
          if (commentId && !commentsResponse.data.comments.some(c => c.id === commentId) && isMounted.current) {
            const firstComment = commentsResponse.data.comments[0];
            navigate(`/manual-review?id=${firstComment.id}`);
          }
        } else {
          // If no comments found for this category, try "All Tags"
          const allCommentsResponse = await getProcessedComments(
            1,
            100,
            "All Tags",
            currentProjectId
          );
          
          if (allCommentsResponse.success && allCommentsResponse.data && 
              allCommentsResponse.data.comments && allCommentsResponse.data.comments.length > 0) {
            
            // Find the index of the current comment, if any
            let currentIdx = 0;
            if (commentId) {
              const foundIndex = allCommentsResponse.data.comments.findIndex(c => c.id === commentId);
              if (foundIndex >= 0) {
                currentIdx = foundIndex;
              }
            }
            
            // Update review state in Zustand store
            setReviewState({
              commentsList: allCommentsResponse.data.comments,
              category: "All Tags",
              index: currentIdx,
              totalCount: allCommentsResponse.data.pagination.total || allCommentsResponse.data.comments.length
            });
            
            // Update local state if component is still mounted
            if (isMounted.current) {
              setCommentsList(allCommentsResponse.data.comments);
              setListCategory("All Tags");
              setCurrentIndex(currentIdx);
              setTotalCount(allCommentsResponse.data.pagination.total || allCommentsResponse.data.comments.length);
              
              // If we have a category from the URL, this is a list navigation view
              const categoryParam = searchParams.get('category');
              setIsSingleCommentMode(!categoryParam);
            }
            
            // Navigate to current comment or first comment
            if (isMounted.current) {
              const targetComment = commentId ? 
                allCommentsResponse.data.comments.find(c => c.id === commentId) : 
                allCommentsResponse.data.comments[0];
              
              if (targetComment) {
                navigate(`/manual-review?id=${targetComment.id}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing comments list:", error);
    }
  }, [currentProjectId, commentId, navigate, reviewState.category, setReviewState, searchParams]);

  // Update states when reviewState changes in the store
  useEffect(() => {
    if (isMounted.current) {
      setCommentsList(reviewState.commentsList || []);
      setCurrentIndex(reviewState.index || 0);
      setTotalCount(reviewState.totalCount || 0);
      setListCategory(reviewState.category || '');
      
      // If we have a category from the URL, this is a list navigation view
      const categoryParam = searchParams.get('category');
      setIsSingleCommentMode(!categoryParam);
    }
  }, [reviewState, searchParams]);

  // Sync list category changes with Zustand store
  useEffect(() => {
    if (listCategory !== reviewState.category) {
      setReviewState({
        ...reviewState,
        category: listCategory
      });
    }
  }, [listCategory, reviewState, setReviewState]);

  // Synchronize URL parameter with current comment when navigating
  useEffect(() => {
    if (commentsList.length > 0 && commentId && isMounted.current) {
      // Skip if this is the same ID we just processed
      if (commentId === lastProcessedIdRef.current) {
        return;
      }
      
      // Find the index of this comment in our list
      const matchIndex = commentsList.findIndex(c => c.id === commentId);
      if (matchIndex !== -1 && matchIndex !== currentIndex) {
        // Save this ID to prevent repeat processing
        lastProcessedIdRef.current = commentId;
        
        // Update the index
        setCurrentIndex(matchIndex);
        
        // Update review state in Zustand store
        setReviewState({
          ...reviewState,
          index: matchIndex
        });
      }
    }
  }, [commentId, commentsList, currentIndex, reviewState, setReviewState]);

  // Navigate to previous comment in list
  const handlePrevItem = useCallback(() => {
    if (currentIndex > 0 && commentsList.length > 0 && isMounted.current) {
      const prevIndex = currentIndex - 1;
      const prevComment = commentsList[prevIndex];
      
      // Update index
      setCurrentIndex(prevIndex);
      
      // Update review state in Zustand store
      setReviewState({
        ...reviewState,
        index: prevIndex
      });
      
      // Save this ID to prevent loops from the URL effect
      lastProcessedIdRef.current = prevComment.id;
      
      // Navigate to the previous comment, including the category param
      navigate(`/manual-review?id=${prevComment.id}&category=${encodeURIComponent(listCategory)}`);
    }
  }, [currentIndex, commentsList, navigate, reviewState, setReviewState, listCategory]);

  // Navigate to next comment in list
  const handleNextItem = useCallback(() => {
    if (currentIndex < commentsList.length - 1 && commentsList.length > 0 && isMounted.current) {
      const nextIndex = currentIndex + 1;
      const nextComment = commentsList[nextIndex];
      
      // Update index
      setCurrentIndex(nextIndex);
      
      // Update review state in Zustand store
      setReviewState({
        ...reviewState,
        index: nextIndex
      });
      
      // Save this ID to prevent loops from the URL effect
      lastProcessedIdRef.current = nextComment.id;
      
      // Use setTimeout to break the potential update cycle
      setTimeout(() => {
        if (isMounted.current) {
          // Include the category param when navigating
          navigate(`/manual-review?id=${nextComment.id}&category=${encodeURIComponent(listCategory)}`);
          window.scrollTo(0, 0);
        }
      }, 0);
    }
  }, [currentIndex, commentsList, navigate, reviewState, setReviewState, listCategory]);

  // Navigate back to auto review
  const navigateBack = useCallback(() => {
    // Clear review state before navigating away
    clearReviewState();
    // Navigate back with a timestamp to force refresh
    navigate('/auto-review?refresh=' + Date.now());
  }, [navigate, clearReviewState]);

  // Exit list mode and navigate back
  const exitListMode = useCallback(() => {
    // Clear review state in Zustand store
    clearReviewState();
    
    // Update local state if still mounted
    if (isMounted.current) {
      setCommentsList([]);
      setListCategory('');
    }
    
    // Navigate back with a timestamp to force refresh
    navigate('/auto-review?refresh=' + Date.now());
  }, [navigate, clearReviewState]);

  // Fetch comment details for a specific ID
  const fetchCommentDetails = useCallback(async (id) => {
    if (!id) return;
    
    try {
      if (isMounted.current) {
        setIsLoading(true);
        setError(null);
      }
      
      // Get comment by ID
      const response = await getCommentById(id, currentProjectId);
      
      if (response.success && response.data && isMounted.current) {
        setComment(response.data);
        setKeywords(response.data.keywords || []);
        setSelectedCategory(response.data.category || "");
        
        // Set similar comments from the response if available
        if (response.data.similar_comments && Array.isArray(response.data.similar_comments)) {
          setSimilarComments(response.data.similar_comments);
        } else {
          setSimilarComments([]);
        }
      } else if (isMounted.current) {
        throw new Error(response.message || 'Failed to fetch comment');
      }
    } catch (err) {
      console.error("Error fetching comment:", err);
      
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch comment');
        
        // If there's a comment in the list, use that basic info
        if (commentsList.length > 0) {
          const fallbackComment = commentsList.find(c => c.id === id);
          if (fallbackComment) {
            setComment({
              id: fallbackComment.id,
              comment: fallbackComment.comment || "Error loading complete details.",
              category: fallbackComment.category || "Unknown",
              confidence: fallbackComment.confidence || 0
            });
            setSelectedCategory(fallbackComment.category || "");
          }
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [currentProjectId, commentsList]);

  // Fetch individual comment data based on ID from URL
  useEffect(() => {
    if (!commentId) return;
    
    const fetchCommentData = async () => {
      await fetchCommentDetails(commentId);
    };
    
    // Use mock data if needed
    if (commentId && (!currentProjectId || process.env.REACT_APP_USE_MOCK_DATA === 'true')) {
      const foundComment = mockComments.find(c => c.id === commentId);
      if (foundComment && isMounted.current) {
        setComment(foundComment);
        setSelectedCategory(foundComment.category);
        // Get similar mock comments
        const similarMockComments = mockComments
          .filter(c => c.category === foundComment.category && c.id !== commentId)
          .slice(0, 3)
          .map(c => ({
            ...c,
            similarity: Math.floor(Math.random() * 30 + 70) / 100
          }));
        setSimilarComments(similarMockComments);
        setIsLoading(false);
      } else if (isMounted.current) {
        setError('Comment not found');
        setIsLoading(false);
      }
    } else if (commentId && currentProjectId) {
      fetchCommentData();
    } else if (isMounted.current) {
      setIsLoading(false);
    }
  }, [commentId, currentProjectId, fetchCommentDetails]);

  // Handle submitting a category update
  const handleSubmit = useCallback(async () => {
    if (!comment || !isMounted.current) return;
    
    setIsSubmitting(true);
    try {
      // Call API to update comment category
      await updateCommentCategory(comment.id, selectedCategory, currentProjectId);
      
      if (isMounted.current) {
        // Mark this item as completed
        if (commentsList.length > 0 && !isSingleCommentMode) {
          setCompletedItems(prev => ({
            ...prev,
            [comment.id]: selectedCategory
          }));
          
          // Automatically go to next item if not at end of list
          if (currentIndex < commentsList.length - 1) {
            handleNextItem();
          } else {
            // Show completion message when end of list is reached
            navigate('/auto-review?refresh=' + Date.now());
          }
        } else {
          // For single comment mode, navigate back to auto review with refresh
          navigate('/auto-review?refresh=' + Date.now());
        }
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      if (isMounted.current) {
        setError('Failed to update comment category');
      }
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  }, [comment, selectedCategory, currentProjectId, commentsList, currentIndex, handleNextItem, navigate, isSingleCommentMode]);

  // Listen for application reset
  useEffect(() => {
    const handleReset = () => {
      if (isMounted.current) {
        // Clear all state
        setComment(null);
        setKeywords([]);
        setSimilarComments([]);
        setSelectedCategory("");
        setIsSubmitting(false);
        setIsLoading(false);
        setError(null);
        setCommentsList([]);
        setCurrentIndex(0);
        setTotalCount(0);
        setListCategory('');
        setCompletedItems({});
      }
    };
    
    window.addEventListener('applicationReset', handleReset);
    window.addEventListener('importStatusReset', handleReset);
    
    return () => {
      window.removeEventListener('applicationReset', handleReset);
      window.removeEventListener('importStatusReset', handleReset);
    };
  }, []);

  // Listen for processing completed event
  useEffect(() => {
    const handleProcessingCompleted = () => {
      refreshCommentsList();
    };
    
    window.addEventListener('processingCompleted', handleProcessingCompleted);
    
    return () => {
      window.removeEventListener('processingCompleted', handleProcessingCompleted);
    };
  }, [refreshCommentsList]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      // Don't clear review state here to allow for navigation back to the same review state
      isMounted.current = false;
    };
  }, []);

  return {
    comment,
    keywords,
    similarComments,
    selectedCategory,
    isSubmitting,
    isLoading,
    error,
    isRefreshing,
    commentsList,
    currentIndex,
    totalCount,
    listCategory,
    completedItems,
    isSingleCommentMode,
    handlePrevItem,
    handleNextItem,
    navigateBack,
    exitListMode,
    refreshCommentsList,
    handleSubmit,
    setSelectedCategory,
    setError
  };
};