import { NextRequest, NextResponse } from 'next/server';
import { ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_CONFIG, isR2Configured } from '@/lib/r2';

export async function GET(request: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({
        error: 'R2 is not configured. Please set up your environment variables.',
        configured: false,
        requiredEnvVars: ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_CUSTOM_DOMAIN']
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list-objects';

    if (action === 'list-buckets') {
      // List all buckets
      const command = new ListBucketsCommand({});
      const response = await r2Client.send(command);
      
      return NextResponse.json({
        success: true,
        buckets: response.Buckets,
        owner: response.Owner,
        customDomain: R2_CONFIG.CUSTOM_DOMAIN,
        customDomainConfigured: !!R2_CONFIG.CUSTOM_DOMAIN,
      });
    } else if (action === 'list-objects') {
      // List objects in the configured bucket
      const command = new ListObjectsV2Command({ 
        Bucket: R2_CONFIG.BUCKET_NAME,
        MaxKeys: 100 // Limit to 100 objects
      });
      const response = await r2Client.send(command);
      
      return NextResponse.json({
        success: true,
        bucket: R2_CONFIG.BUCKET_NAME,
        objects: response.Contents || [],
        keyCount: response.KeyCount || 0,
        isTruncated: response.IsTruncated || false,
      });
    } else {
      return NextResponse.json({
        error: 'Invalid action. Use "list-buckets" or "list-objects"'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('R2 API error:', error);
    return NextResponse.json({
      error: 'Failed to connect to R2',
      details: error instanceof Error ? error.message : 'Unknown error',
      configured: isR2Configured()
    }, { status: 500 });
  }
}
