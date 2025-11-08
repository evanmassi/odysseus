/**
 * Lazy Component Utilities
 * 
 * Utilities for managing lazy component loading, preloading, and performance monitoring
 */

import type { ComponentType } from 'react';
import React, { lazy } from 'react';

import { env } from '@shared/config';

// Lazy loading configuration
export interface LazyLoadConfig {
  // Preloading
  preloadDelay?: number; // Delay before auto-preloading (ms)
  preloadOnHover?: boolean; // Preload on hover
  preloadOnFocus?: boolean; // Preload on focus
  preloadOnViewport?: boolean; // Preload when component enters viewport
  
  // Performance
  timeout?: number; // Loading timeout (ms)
  retryAttempts?: number; // Number of retry attempts
  
  // Caching
  cacheComponents?: boolean; // Cache loaded components
  
  // Monitoring
  enableMetrics?: boolean; // Enable performance metrics
}

// Default configuration
const defaultConfig: LazyLoadConfig = {
  preloadDelay: 0,
  preloadOnHover: true,
  preloadOnFocus: true,
  preloadOnViewport: false,
  timeout: 10000,
  retryAttempts: 3,
  cacheComponents: true,
  enableMetrics: env.isDev(),
};

// Component cache for lazy loaded components
const componentCache = new Map<string, ComponentType<any>>();

// Performance metrics
interface LazyLoadMetrics {
  componentName: string;
  loadTime: number;
  attempts: number;
  success: boolean;
  timestamp: number;
  error?: string;
}

const metricsCollection: LazyLoadMetrics[] = [];

// Enhanced lazy loading function
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>,
  componentName: string,
  config: LazyLoadConfig = {}
) => {
  const finalConfig = { ...defaultConfig, ...config };
  const cacheKey = componentName;
  
  // Check cache first
  if (finalConfig.cacheComponents && componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey)!;
  }
  
  // Create lazy component with enhanced error handling and retries
  const LazyComponent = lazy(async () => {
    const startTime = performance.now();
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= (finalConfig.retryAttempts || 3); attempt++) {
      try {
        // Add timeout handling
        const loadPromise = importFn();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Lazy loading timeout after ${finalConfig.timeout}ms`));
          }, finalConfig.timeout);
        });
        
        const result = await Promise.race([loadPromise, timeoutPromise]);
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        // Handle different module formats
        const component = 'default' in result ? result.default : result;
        
        // Cache the component
        if (finalConfig.cacheComponents) {
          componentCache.set(cacheKey, component);
        }
        
        // Record metrics
        if (finalConfig.enableMetrics) {
          metricsCollection.push({
            componentName,
            loadTime,
            attempts: attempt,
            success: true,
            timestamp: Date.now(),
          });
          
          console.log(`Lazy loaded ${componentName} in ${loadTime.toFixed(2)}ms (attempt ${attempt})`);
        }
        
        return { default: component };
      } catch (error) {
        lastError = error as Error;
        
        if (finalConfig.enableMetrics) {
          console.warn(`⚠️ Failed to load ${componentName} (attempt ${attempt}/${finalConfig.retryAttempts}):`, error);
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < (finalConfig.retryAttempts || 3)) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }
    
    // All attempts failed
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    if (finalConfig.enableMetrics) {
      metricsCollection.push({
        componentName,
        loadTime: totalTime,
        attempts: finalConfig.retryAttempts || 3,
        success: false,
        timestamp: Date.now(),
        error: lastError?.message,
      });
      
      console.error(`❌ Failed to load ${componentName} after ${finalConfig.retryAttempts} attempts in ${totalTime.toFixed(2)}ms`);
    }
    
    throw lastError || new Error(`Failed to load ${componentName} after ${finalConfig.retryAttempts} attempts`);
  });
  
  // Set displayName for debugging - type assertion for LazyExoticComponent
  (LazyComponent as any).displayName = `Lazy(${componentName})`;
  
  return LazyComponent;
};

// Preloading utilities
export class PreloadManager {
  private static preloadPromises = new Map<string, Promise<void>>();
  private static preloadedComponents = new Set<string>();
  
  static async preload(
    importFn: () => Promise<any>,
    componentName: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    if (this.preloadedComponents.has(componentName)) {
      return;
    }
    
    if (this.preloadPromises.has(componentName)) {
      return this.preloadPromises.get(componentName);
    }
    
    const preloadPromise = this.executePreload(importFn, componentName, priority);
    this.preloadPromises.set(componentName, preloadPromise);
    
    return preloadPromise;
  }
  
  private static async executePreload(
    importFn: () => Promise<any>,
    componentName: string,
    priority: 'high' | 'medium' | 'low'
  ): Promise<void> {
    try {
      const startTime = performance.now();
      
      // Delay for lower priority preloads to not block critical resources
      const delay = priority === 'high' ? 0 : priority === 'medium' ? 100 : 500;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await importFn();
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      this.preloadedComponents.add(componentName);
      this.preloadPromises.delete(componentName);
      
      if (env.isDev()) {
        console.log(`🚀 Preloaded ${componentName} in ${loadTime.toFixed(2)}ms (priority: ${priority})`);
      }
    } catch (error) {
      this.preloadPromises.delete(componentName);
      
      if (env.isDev()) {
        console.warn(`Failed to preload ${componentName}:`, error);
      }
    }
  }
  
  // Batch preload multiple components
  static async batchPreload(
    components: Array<{
      importFn: () => Promise<any>;
      name: string;
      priority?: 'high' | 'medium' | 'low';
    }>
  ): Promise<void> {
    const preloadPromises = components.map(({ importFn, name, priority }) =>
      this.preload(importFn, name, priority)
    );
    
    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      if (env.isDev()) {
        console.warn('Some components failed to preload during batch operation:', error);
      }
    }
  }
  
  // Preload components based on user interaction patterns
  static preloadOnInteraction(
    element: HTMLElement,
    importFn: () => Promise<any>,
    componentName: string,
    options: {
      onHover?: boolean;
      onFocus?: boolean;
      onViewport?: boolean;
      delay?: number;
    } = {}
  ): () => void {
    const { onHover = true, onFocus = true, onViewport = false, delay = 0 } = options;
    const listeners: Array<() => void> = [];
    
    const preloadWithDelay = () => {
      setTimeout(() => {
        void this.preload(importFn, componentName, 'medium');
      }, delay);
    };
    
    if (onHover) {
      const hoverHandler = () => preloadWithDelay();
      element.addEventListener('mouseenter', hoverHandler);
      listeners.push(() => element.removeEventListener('mouseenter', hoverHandler));
    }
    
    if (onFocus) {
      const focusHandler = () => preloadWithDelay();
      element.addEventListener('focus', focusHandler);
      listeners.push(() => element.removeEventListener('focus', focusHandler));
    }
    
    if (onViewport && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            preloadWithDelay();
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      
      observer.observe(element);
      listeners.push(() => observer.disconnect());
    }
    
    // Return cleanup function
    return () => {
      listeners.forEach(cleanup => cleanup());
    };
  }
  
  // Get preload status
  static getPreloadStatus(): {
    preloaded: string[];
    loading: string[];
    total: number;
  } {
    return {
      preloaded: Array.from(this.preloadedComponents),
      loading: Array.from(this.preloadPromises.keys()),
      total: this.preloadedComponents.size + this.preloadPromises.size,
    };
  }
}

// Performance metrics utilities
export const LazyLoadMetrics = {
  // Get all metrics
  getMetrics(): LazyLoadMetrics[] {
    return [...metricsCollection];
  },
  
  // Get metrics for a specific component
  getComponentMetrics(componentName: string): LazyLoadMetrics[] {
    return metricsCollection.filter(m => m.componentName === componentName);
  },
  
  // Get performance summary
  getSummary() {
    const successful = metricsCollection.filter(m => m.success);
    const failed = metricsCollection.filter(m => !m.success);
    
    const avgLoadTime = successful.length > 0
      ? successful.reduce((sum, m) => sum + m.loadTime, 0) / successful.length
      : 0;
    
    return {
      total: metricsCollection.length,
      successful: successful.length,
      failed: failed.length,
      successRate: metricsCollection.length > 0 
        ? (successful.length / metricsCollection.length) * 100 
        : 0,
      averageLoadTime: avgLoadTime,
      slowestComponent: successful.reduce((slowest, current) => 
        current.loadTime > slowest.loadTime ? current : slowest, 
        successful[0] || { componentName: 'none', loadTime: 0 }
      ),
    };
  },
  
  // Clear metrics
  clear() {
    metricsCollection.length = 0;
  },
  
  // Export metrics to JSON
  export() {
    return JSON.stringify({
      metrics: metricsCollection,
      summary: this.getSummary(),
      timestamp: Date.now(),
    }, null, 2);
  },
};

// Development utilities
if (env.isDev()) {
  (window as any).lazyLoadUtils = {
    preloadManager: PreloadManager,
    metrics: LazyLoadMetrics,
    componentCache,
  };
}
