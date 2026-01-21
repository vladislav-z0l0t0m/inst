import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { MINIO_CONSTANTS } from '../constants/minio.constants';
import { BucketType } from '../enums/file-type.enum';
import { getFileExtension } from '../utils/file.utils';
import { UploadResult } from '../models/upload-result.model';

@Injectable()
export class MinioService {
  private readonly minioClient: Client;
  private readonly logger = new Logger(MinioService.name);

  constructor(private configService: ConfigService) {
    this.minioClient = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT')!,
      port: this.configService.get<number>('MINIO_PORT'),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY'),
    });
  }

  async uploadFile(
    bucketName: BucketType,
    file: Express.Multer.File,
    folder?: string,
  ): Promise<string> {
    const fileExtension = getFileExtension(file.originalname);
    const fileName = `${folder || MINIO_CONSTANTS.FOLDERS.IMAGES}/${uuidv4()}.${fileExtension}`;
    await this.minioClient.putObject(
      bucketName,
      fileName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );
    const fileUrl = this.getFileUrl(bucketName, fileName);
    this.logger.log(`File uploaded successfully: ${fileUrl}`);
    return fileUrl;
  }

  async uploadMultipleFiles(
    bucketName: BucketType,
    files: Express.Multer.File[],
    folder?: string,
  ): Promise<UploadResult> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(bucketName, file, folder),
    );

    const results = await Promise.allSettled(uploadPromises);

    return results.reduce<UploadResult>(
      (acc, result, index) => {
        if (result.status === 'fulfilled') {
          acc.successful.push({
            filename: files[index].originalname,
            url: result.value,
          });
        } else {
          let errorMessage = 'An unknown error occurred';

          if (result.reason instanceof Error) {
            errorMessage = result.reason.message;
          } else if (typeof result.reason === 'string') {
            errorMessage = result.reason;
          }

          acc.failed.push({
            filename: files[index].originalname,
            message: errorMessage,
          });
        }
        return acc;
      },
      { successful: [], failed: [] },
    );
  }

  async deleteFile(bucketName: BucketType, fileUrl: string): Promise<void> {
    const objectName = this.getObjectNameFromUrl(fileUrl);
    await this.minioClient.removeObject(bucketName, objectName);
    this.logger.log(`File deleted successfully: ${fileUrl}`);
  }

  async deleteMultipleFiles(
    bucketName: BucketType,
    fileUrls: string[],
  ): Promise<void> {
    const deletePromises = fileUrls.map((url) =>
      this.deleteFile(bucketName, url),
    );
    await Promise.all(deletePromises);
  }

  getFileUrl(bucketName: BucketType, objectName: string): string {
    const publicFileUrl = this.configService.get<string>('PUBLIC_FILE_URL');
    return `${publicFileUrl}/${bucketName}/${objectName}`;
  }

  private getObjectNameFromUrl(fileUrl: string): string {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts[0] === 'files') {
      return pathParts.slice(2).join('/');
    }
    return pathParts.slice(1).join('/');
  }
}
