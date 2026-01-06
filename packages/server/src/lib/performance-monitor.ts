/**
 * Centralized performance monitoring for Auto-Claude operations
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  itemsProcessed?: number;
  memoryUsed?: number;
  errors?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  /**
   * Start timing an operation
   */
  startTimer(operation: string): (itemsProcessed?: number, errors?: number) => PerformanceMetric {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    return (itemsProcessed?: number, errors?: number): PerformanceMetric => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      const metric: PerformanceMetric = {
        operation,
        duration: endTime - startTime,
        timestamp: Date.now(),
        itemsProcessed,
        memoryUsed: endMemory - startMemory,
        errors
      };

      this.addMetric(metric);
      return metric;
    };
  }

  /**
   * Add a metric and maintain buffer size
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Log performance metric if it exceeds thresholds
   */
  logIfSlow(metric: PerformanceMetric, thresholdMs: number = 100): void {
    if (metric.duration > thresholdMs) {
      const throughput = metric.itemsProcessed ?
        `${Math.round(metric.itemsProcessed / (metric.duration / 1000))}/s` : 'N/A';

      const memoryMB = metric.memoryUsed ?
        `${Math.round(metric.memoryUsed / 1024 / 1024)}MB` : 'N/A';

      console.log(
        `[PERF] ${metric.operation} completed in ${Math.round(metric.duration)}ms ` +
        `(${metric.itemsProcessed || 0} items, ${metric.errors || 0} errors, ` +
        `throughput: ${throughput}, memory: ${memoryMB})`
      );
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalItems: number;
    totalErrors: number;
  } | null {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);

    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map(m => m.duration);
    const totalItems = operationMetrics.reduce((sum, m) => sum + (m.itemsProcessed || 0), 0);
    const totalErrors = operationMetrics.reduce((sum, m) => sum + (m.errors || 0), 0);

    return {
      count: operationMetrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalItems,
      totalErrors
    };
  }

  /**
   * Get recent performance trends
   */
  getRecentTrends(): Array<{
    operation: string;
    recentAvg: number;
    trend: 'improving' | 'degrading' | 'stable';
  }> {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    const trends: Array<{
      operation: string;
      recentAvg: number;
      trend: 'improving' | 'degrading' | 'stable';
    }> = [];

    for (const operation of operations) {
      const operationMetrics = this.metrics
        .filter(m => m.operation === operation)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (operationMetrics.length < 4) continue;

      const recentMetrics = operationMetrics.slice(-10); // Last 10 metrics
      const olderMetrics = operationMetrics.slice(-20, -10); // Previous 10 metrics

      if (olderMetrics.length === 0) continue;

      const recentAvg = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
      const olderAvg = olderMetrics.reduce((sum, m) => sum + m.duration, 0) / olderMetrics.length;

      const improvement = (olderAvg - recentAvg) / olderAvg;
      let trend: 'improving' | 'degrading' | 'stable' = 'stable';

      if (improvement > 0.1) trend = 'improving';
      else if (improvement < -0.1) trend = 'degrading';

      trends.push({
        operation,
        recentAvg,
        trend
      });
    }

    return trends;
  }

  /**
   * Clear all metrics (useful for testing or memory management)
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get current system resource usage
   */
  getSystemStats(): {
    memoryUsage: number;
    heapTotal: number;
    heapUsed: number;
    uptime: number;
  } {
    const memory = process.memoryUsage();

    return {
      memoryUsage: memory.rss / 1024 / 1024, // MB
      heapTotal: memory.heapTotal / 1024 / 1024, // MB
      heapUsed: memory.heapUsed / 1024 / 1024, // MB
      uptime: process.uptime() // seconds
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Convenience function to time async operations
 */
export async function timeOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  itemsProcessed?: number,
  errors?: number
): Promise<{ result: T; metric: PerformanceMetric }> {
  const timer = performanceMonitor.startTimer(operation);
  const result = await fn();
  const metric = timer(itemsProcessed, errors);

  // Log if operation was slow
  performanceMonitor.logIfSlow(metric);

  return { result, metric };
}

/**
 * Convenience function to time sync operations
 */
export function timeOperationSync<T>(
  operation: string,
  fn: () => T,
  itemsProcessed?: number,
  errors?: number
): { result: T; metric: PerformanceMetric } {
  const timer = performanceMonitor.startTimer(operation);
  const result = fn();
  const metric = timer(itemsProcessed, errors);

  // Log if operation was slow
  performanceMonitor.logIfSlow(metric);

  return { result, metric };
}