/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache.wicket.ajax;

import org.apache.wicket.Component;
import org.apache.wicket.ajax.calldecorator.AjaxPostprocessingCallDecorator;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

/**
 * @author tetsuo WICKET-2057
 */
public class AjaxPostprocessingCallDecoratorTest extends Assert
{
	IAjaxCallDecorator delegate;
	AjaxPostprocessingCallDecorator decorator;

	/**
	 * 
	 */
	@Before
	public void before()
	{
		delegate = new IAjaxCallDecorator()
		{
			private static final long serialVersionUID = 1L;

			public CharSequence decorateScript(Component component, CharSequence script)
			{
				return "^" + script;
			}

			public CharSequence decorateOnSuccessScript(Component component, CharSequence script)
			{
				return "^s" + script;
			}

			public CharSequence decorateOnFailureScript(Component component, CharSequence script)
			{
				return "^f" + script;
			}
		};
		decorator = new AjaxPostprocessingCallDecorator(delegate)
		{
			private static final long serialVersionUID = 1L;

			@Override
			public CharSequence postDecorateScript(Component component, CharSequence script)
			{
				return "-" + super.postDecorateScript(component, script);
			}

			@Override
			public CharSequence postDecorateOnSuccessScript(Component component, CharSequence script)
			{
				return "-s" + super.postDecorateOnSuccessScript(component, script);
			}

			@Override
			public CharSequence postDecorateOnFailureScript(Component component, CharSequence script)
			{
				return "-f" + super.postDecorateOnFailureScript(component, script);
			}
		};
	}

	/** test script */
	@Test
	public void fecorateScript()
	{
		Assert.assertEquals("-^.", decorator.decorateScript(null, "."));
	}

	/** test script */
	@Test
	public void decorateOnSuccessScript()
	{
		Assert.assertEquals("-s^s.", decorator.decorateOnSuccessScript(null, "."));
	}

	/** test script */
	@Test
	public void decorateOnFailureScript()
	{
		Assert.assertEquals("-f^f.", decorator.decorateOnFailureScript(null, "."));
	}
}
