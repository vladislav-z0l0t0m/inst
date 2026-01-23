import {
  Controller,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

import { ParamsIdDto } from 'src/common/dto/params-id.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsService } from './comments.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReactionsService } from '../reactions/reactions.service';
import { ReactionType } from '../reactions/constants/reaction-type.enum';
import { ReactionResponseDto } from '../reactions/dto/reaction-response.dto';
import { ReactableType } from '../reactions/constants/reactable-type.enum';
import { CommentResponseDto } from './dto/comment-response.dto';

import { CursorPaginatedCommentsResponseDto } from './dto/cursor-paginated-comments.dto';
import { CursorPaginationDto } from 'src/common/dto/cursor-pagination.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Comments')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly reactionsService: ReactionsService,
  ) {}

  @ApiOperation({
    summary: 'Get comment',
    description: 'Get a comment by id.',
  })
  @ApiOkResponse({ description: 'Comment returned', type: CommentResponseDto })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @Public()
  @Get(':id')
  async getComment(
    @Param() { id: commentId }: ParamsIdDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<CommentResponseDto> {
    return this.commentsService.findOne(commentId, user?.userId);
  }

  @ApiOperation({
    summary: 'Get comments replies',
    description: 'Get comments replies by id.',
  })
  @ApiOkResponse({
    description: 'List of comments with pagination',
    type: CursorPaginatedCommentsResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @Public()
  @Get(':id/replies')
  async getCommentsReplies(
    @Param() { id: commentId }: ParamsIdDto,
    @Query() paginationDto: CursorPaginationDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<CursorPaginatedCommentsResponseDto> {
    return this.commentsService.findRepliesForComment(
      commentId,
      paginationDto,
      user?.userId,
    );
  }

  @ApiOperation({
    summary: 'Update comment',
    description: 'Update the text of a comment by id.',
  })
  @ApiOkResponse({ description: 'Comment updated', type: CommentResponseDto })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiForbiddenResponse({
    description: 'Forbidden - you are not the author of this comment',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @Patch(':id')
  async updateComment(
    @Param() { id: commentId }: ParamsIdDto,
    @Body() body: UpdateCommentDto,
    @CurrentUser() { userId: authorId }: AuthUser,
  ): Promise<CommentResponseDto> {
    return this.commentsService.update(commentId, authorId, body);
  }

  @ApiOperation({
    summary: 'Delete comment',
    description:
      'Delete a comment by id. for root - hard deleting, for reply - soft deleting',
  })
  @ApiNoContentResponse({ description: 'Comment deleted' })
  @ApiNotFoundResponse({
    description: 'Comment not found or not yours to delete',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Param() { id: commentId }: ParamsIdDto,
    @CurrentUser() { userId: authorId }: AuthUser,
  ): Promise<void> {
    return this.commentsService.remove(commentId, authorId);
  }

  @ApiOperation({
    summary: 'Like comment',
    description:
      'Set a like on the comment. If this reaction exists - remove it.',
  })
  @ApiOkResponse({ description: 'Reaction updated', type: ReactionResponseDto })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/like')
  async like(
    @Param() { id: commentId }: ParamsIdDto,
    @CurrentUser() { userId }: AuthUser,
  ): Promise<ReactionResponseDto> {
    return this.reactionsService.handleReaction(
      commentId,
      ReactableType.COMMENT,
      { type: ReactionType.LIKE },
      userId,
    );
  }

  @ApiOperation({
    summary: 'Dislike comment',
    description:
      'Set a dislike on the comment. If this reaction exists - remove it.',
  })
  @ApiOkResponse({ description: 'Reaction updated', type: ReactionResponseDto })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/dislike')
  async dislike(
    @Param() { id: commentId }: ParamsIdDto,
    @CurrentUser() { userId }: AuthUser,
  ): Promise<ReactionResponseDto> {
    return this.reactionsService.handleReaction(
      commentId,
      ReactableType.COMMENT,
      { type: ReactionType.DISLIKE },
      userId,
    );
  }

  @ApiOperation({
    summary: 'Set reaction on comment',
    description:
      'Set or update a reaction on the comment. If this reaction exists - remove it.',
  })
  @ApiOkResponse({ description: 'Reaction updated', type: ReactionResponseDto })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiParam({ name: 'id', type: Number, description: 'Comment ID' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/reactions')
  async setReaction(
    @Param() { id: commentId }: ParamsIdDto,
    @Body() body: { type: ReactionType },
    @CurrentUser() { userId }: AuthUser,
  ): Promise<ReactionResponseDto> {
    return this.reactionsService.handleReaction(
      commentId,
      ReactableType.COMMENT,
      { type: body.type },
      userId,
    );
  }
}
