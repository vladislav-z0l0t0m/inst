import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  Query,
  UseInterceptors,
  UploadedFiles,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PostResponseDto } from './dto/post-response.dto';
import { ParamsIdDto } from '../common/dto/params-id.dto';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { ReactionsService } from '../reactions/reactions.service';
import { ReactionType } from '../reactions/constants/reaction-type.enum';
import { ReactionResponseDto } from '../reactions/dto/reaction-response.dto';
import { CreateReactionDto } from '../reactions/dto/create-reaction.dto';
import { CommentResponseDto } from '../comments/dto/comment-response.dto';
import { CreateCommentDto } from '../comments/dto/create-comment.dto';
import { CommentsService } from '../comments/comments.service';
import { ReactableType } from 'src/reactions/constants/reactable-type.enum';
import { CursorPaginatedPostsResponseDto } from './dto/cursor-paginated-post-response.dto';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';
import { CursorPaginatedCommentsResponseDto } from 'src/comments/dto/cursor-paginated-comments.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MINIO_CONSTANTS } from '../common/constants/minio.constants';
import { Response } from 'express';
import {
  UploadFilesPartialResponseDto,
  UploadFilesSuccessResponseDto,
} from '../common/dto/upload-files-response.dto';
import { FileService } from '../common/services/file.service';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constants';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Posts')
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: 'Internal server error',
})
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly reactionsService: ReactionsService,
    private readonly commentsService: CommentsService,
    private readonly fileService: FileService,
  ) {}

  @ApiOperation({
    summary: 'Create post',
    description: 'Create a new post and return it',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Post created' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  @Post()
  create(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PostResponseDto> {
    return this.postsService.create(createPostDto, user);
  }

  @ApiOperation({
    summary: 'Like post',
    description: 'Set a like on the post. If this reaction exists - remove it.',
  })
  @ApiOkResponse({
    description: 'Reaction status and entity',
    type: ReactionResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/like')
  async like(
    @Param() { id: postId }: ParamsIdDto,
    @CurrentUser() { userId }: AuthUser,
  ): Promise<ReactionResponseDto> {
    return this.reactionsService.handleReaction(
      postId,
      ReactableType.POST,
      { type: ReactionType.LIKE },
      userId,
    );
  }

  @ApiOperation({
    summary: 'Dislike post',
    description:
      'Set a dislike on the post. If this reaction exists - remove it.',
  })
  @ApiOkResponse({
    description: 'Reaction status and entity',
    type: ReactionResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/dislike')
  async dislike(
    @Param() { id: postId }: ParamsIdDto,
    @CurrentUser() { userId }: AuthUser,
  ): Promise<ReactionResponseDto> {
    return this.reactionsService.handleReaction(
      postId,
      ReactableType.POST,
      { type: ReactionType.DISLIKE },
      userId,
    );
  }

  @ApiOperation({
    summary: 'Set reaction',
    description:
      'Set or update a reaction on the post. If this reaction exists - remove it.',
  })
  @ApiOkResponse({
    description: 'Reaction status and entity',
    type: ReactionResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/reactions')
  async setReaction(
    @Param() { id: postId }: ParamsIdDto,
    @Body() createReactionDto: CreateReactionDto,
    @CurrentUser() { userId }: AuthUser,
  ): Promise<ReactionResponseDto> {
    return this.reactionsService.handleReaction(
      postId,
      ReactableType.POST,
      createReactionDto,
      userId,
    );
  }

  @ApiOperation({
    summary: 'Get all posts',
    description:
      'Return array of all posts. Authenticated users will see their reactions.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Posts returned' })
  @Public()
  @Get()
  findAll(
    @Query() paginationDto: CursorPaginationDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<CursorPaginatedPostsResponseDto> {
    return this.postsService.findAll(paginationDto, user?.userId);
  }

  @ApiOperation({
    summary: 'Get single post',
    description:
      'Return one post by its ID. Authenticated users will see their reactions.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post returned' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Post not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @Public()
  @Get(':id')
  findOne(
    @Param() { id }: ParamsIdDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<PostResponseDto> {
    return this.postsService.findOne(id, user?.userId);
  }

  @ApiOperation({
    summary: 'Update post',
    description: 'Update the post with given ID and return it',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Post updated' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Post not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @Patch(':id')
  update(
    @Param() { id }: ParamsIdDto,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PostResponseDto> {
    return this.postsService.update(id, updatePostDto, user.userId);
  }

  @ApiOperation({
    summary: 'Delete post',
    description: 'Delete the post with the given ID',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Post deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Post not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(
    @Param() { id }: ParamsIdDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.postsService.remove(id, user.userId);
  }

  @ApiOperation({
    summary: 'Create comment',
    description: 'Create a new comment for the post.',
  })
  @ApiResponse({
    status: 201,
    type: CommentResponseDto,
    description: 'Created comment',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @Post(':id/comments')
  async createComment(
    @Param() { id: postId }: ParamsIdDto,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() { userId: authorId }: AuthUser,
  ): Promise<CommentResponseDto> {
    await this.postsService.ensurePostExists(postId);
    return this.commentsService.create(postId, authorId, createCommentDto);
  }

  @ApiOperation({
    summary: 'Get post comments',
    description: 'Get all comments for the post.',
  })
  @ApiResponse({
    status: 200,
    type: [CommentResponseDto],
    description: 'List of comments',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Post ID' })
  @Public()
  @Get(':id/comments')
  async getPostComments(
    @Param() { id: postId }: ParamsIdDto,
    @Query() paginationDto: CursorPaginationDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<CursorPaginatedCommentsResponseDto> {
    return this.commentsService.findPostRootComments(
      postId,
      paginationDto,
      user?.userId,
    );
  }

  @ApiOperation({
    summary: 'Upload images for post',
    description:
      'Upload one or multiple images for a post and return their upload status',
  })
  @ApiCreatedResponse({ type: UploadFilesSuccessResponseDto })
  @ApiResponse({ status: 207, type: UploadFilesPartialResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid file type or file size exceeds limit',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - JWT token required' })
  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('files', MINIO_CONSTANTS.FILE_LIMITS.MAX_FILES),
  )
  async uploadPostImages(
    @Param() { id: postId }: ParamsIdDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UploadFilesSuccessResponseDto | UploadFilesPartialResponseDto> {
    const folder = `user-${user.userId}/post-${postId}`;
    const { successful, failed } = await this.fileService.uploadPostFiles(
      files,
      folder,
    );
    if (failed.length > 0) {
      res.status(HttpStatus.MULTI_STATUS);
      return {
        message: ERROR_MESSAGES.UPLOAD_PARTIAL_SUCCESS(
          successful.length,
          files.length,
        ),
        successful,
        failed,
      };
    }
    res.status(HttpStatus.CREATED);
    return { successful };
  }
}
