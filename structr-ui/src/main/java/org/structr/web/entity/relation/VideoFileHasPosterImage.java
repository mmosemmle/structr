/**
 * Copyright (C) 2010-2015 Structr GmbH
 *
 * This file is part of Structr <http://structr.org>.
 *
 * Structr is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Structr is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Structr.  If not, see <http://www.gnu.org/licenses/>.
 */
package org.structr.web.entity.relation;

import org.structr.core.entity.OneToOne;
import org.structr.core.entity.Relation;
import org.structr.web.entity.Image;
import org.structr.web.entity.VideoFile;

/**
 *
 * @author Christian Morgner
 */
public class VideoFileHasPosterImage extends OneToOne<VideoFile, Image> {

	@Override
	public Class<VideoFile> getSourceType() {
		return VideoFile.class;
	}

	@Override
	public Class<Image> getTargetType() {
		return Image.class;
	}

	@Override
	public String name() {
		return "HAS_POSTER_IMAGE";
	}

	@Override
	public int getCascadingDeleteFlag() {
		return Relation.SOURCE_TO_TARGET;
	}
}