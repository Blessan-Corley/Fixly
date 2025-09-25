// app/api/search/suggestions/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import { redisUtils } from '@/lib/redis';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const cacheKey = `search_suggestions:${query.toLowerCase()}`;

    // Try to get from cache first
    try {
      const cached = await redisUtils.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    } catch (cacheError) {
      console.log('Cache miss for suggestions:', cacheError.message);
    }

    await connectDB();

    // Get suggestions from job titles, descriptions, and skills
    const suggestions = await Job.aggregate([
      {
        $match: {
          status: 'open',
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { skills: { $elemMatch: { $regex: query, $options: 'i' } } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          titles: { $addToSet: '$title' },
          skills: { $addToSet: '$skills' },
          keywords: { $addToSet: '$keywords' }
        }
      },
      {
        $project: {
          _id: 0,
          suggestions: {
            $concatArrays: [
              '$titles',
              { $reduce: {
                input: '$skills',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] }
              }},
              { $reduce: {
                input: '$keywords',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] }
              }}
            ]
          }
        }
      }
    ]);

    let suggestionList = [];

    if (suggestions.length > 0 && suggestions[0].suggestions) {
      // Filter and rank suggestions
      suggestionList = suggestions[0].suggestions
        .filter(s => s && s.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
        .sort((a, b) => {
          // Prioritize exact matches and shorter strings
          const aStartsWith = a.toLowerCase().startsWith(query.toLowerCase());
          const bStartsWith = b.toLowerCase().startsWith(query.toLowerCase());

          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;

          return a.length - b.length;
        });
    }

    // Add popular search terms if not enough suggestions
    if (suggestionList.length < 5) {
      const popularTerms = [
        'plumbing repair',
        'electrical work',
        'home cleaning',
        'painting service',
        'carpentry work',
        'garden maintenance',
        'appliance repair',
        'furniture assembly'
      ].filter(term => term.toLowerCase().includes(query.toLowerCase()));

      suggestionList = [...new Set([...suggestionList, ...popularTerms])];
    }

    const finalSuggestions = suggestionList.slice(0, 5);

    // Cache for 10 minutes
    try {
      await redisUtils.setex(cacheKey, 600, JSON.stringify(finalSuggestions));
    } catch (cacheError) {
      console.error('Failed to cache suggestions:', cacheError);
    }

    return NextResponse.json(finalSuggestions);

  } catch (error) {
    console.error('Search suggestions error:', error);
    return NextResponse.json(
      { message: 'Failed to get search suggestions' },
      { status: 500 }
    );
  }
}